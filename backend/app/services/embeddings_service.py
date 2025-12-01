"""
Code Embeddings Service for Dexter.

Uses Jina v2 Code model for code-optimized semantic embeddings.

Note: Jina v2 Code is 161M parameters, heavier than MiniLM but provides
better recall for code and technical content. We accept this compute cost.
"""

import logging
from functools import lru_cache
from typing import List, Optional, Tuple, Union

import numpy as np

logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_MODEL = "jinaai/jina-embeddings-v2-base-code"
EMBEDDING_DIMENSION = 768
DEFAULT_CACHE_SIZE = 1000


class CodeEmbeddings:
    """
    Wrapper for code-optimized embeddings using Jina v2.

    This model is specifically trained on code and technical content,
    providing better similarity matching for:
    - Error messages and stack traces
    - Function and variable names
    - Code patterns and idioms
    - Technical documentation

    Note: 161M params, 768-dim. We accept higher compute for better recall.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
    ):
        """
        Initialize the embeddings model.

        Args:
            model_name: HuggingFace model name (default: Jina v2 Code)
            device: Device to use ('cpu', 'cuda', etc.)
        """
        self.model_name = model_name or DEFAULT_MODEL
        self.device = device
        self.dimension = EMBEDDING_DIMENSION
        self._model = None
        self._initialized = False

    def _load_model(self):
        """Lazy load the model on first use."""
        if self._model is not None:
            return

        try:
            from sentence_transformers import SentenceTransformer

            logger.info(f"Loading embedding model: {self.model_name}")
            logger.info("This may take a moment on first run (~600MB download)...")

            kwargs = {"trust_remote_code": True}
            if self.device:
                kwargs["device"] = self.device

            self._model = SentenceTransformer(self.model_name, **kwargs)
            self._warm_up()
            self._initialized = True

            logger.info(
                f"Embedding model loaded successfully. Dimension: {self.dimension}"
            )
        except ImportError:
            logger.error(
                "sentence-transformers not installed. "
                "Run: pip install sentence-transformers torch"
            )
            raise
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}", exc_info=True)
            raise

    def _warm_up(self):
        """Warm up the model with a dummy embedding to load weights."""
        if self._model:
            _ = self._model.encode(["warm up"], normalize_embeddings=True)
            logger.debug("Model warmed up")

    def ensure_loaded(self):
        """Ensure the model is loaded."""
        if not self._initialized:
            self._load_model()

    def encode(
        self,
        texts: Union[str, List[str]],
        normalize: bool = True,
        show_progress: bool = False,
    ) -> np.ndarray:
        """
        Generate embeddings for text(s).

        Args:
            texts: Single text or list of texts to embed
            normalize: Whether to normalize embeddings (recommended for cosine similarity)
            show_progress: Whether to show progress bar

        Returns:
            NumPy array of embeddings (shape: [n_texts, 768])
        """
        self.ensure_loaded()

        if isinstance(texts, str):
            texts = [texts]

        try:
            embeddings = self._model.encode(
                texts,
                normalize_embeddings=normalize,
                show_progress_bar=show_progress,
            )
            return embeddings
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}", exc_info=True)
            raise

    def encode_single(self, text: str, normalize: bool = True) -> List[float]:
        """
        Encode a single text and return as list.

        Args:
            text: Text to encode
            normalize: Whether to normalize

        Returns:
            List of floats (768-dim)
        """
        embedding = self.encode(text, normalize=normalize)
        return embedding[0].tolist()

    def similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Similarity score (0-1 for normalized embeddings)
        """
        emb1 = self.encode(text1)
        emb2 = self.encode(text2)
        return float(np.dot(emb1[0], emb2[0]))

    def batch_similarity(
        self,
        query: str,
        candidates: List[str],
    ) -> List[Tuple[int, float]]:
        """
        Compute similarity between a query and multiple candidates.

        Args:
            query: Query text
            candidates: List of candidate texts

        Returns:
            List of (index, similarity_score) tuples, sorted by score descending
        """
        if not candidates:
            return []

        query_emb = self.encode(query)
        candidate_embs = self.encode(candidates)

        similarities = np.dot(candidate_embs, query_emb[0])

        results = [(i, float(sim)) for i, sim in enumerate(similarities)]
        results.sort(key=lambda x: x[1], reverse=True)

        return results

    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self._initialized


# Singleton instance
_embeddings_service: Optional[CodeEmbeddings] = None


def get_embeddings_service(
    model_name: Optional[str] = None,
    device: Optional[str] = None,
) -> CodeEmbeddings:
    """
    Get singleton embeddings service (lazy initialization with warm-up).

    Args:
        model_name: Optional model override (only used on first call)
        device: Optional device override (only used on first call)

    Returns:
        CodeEmbeddings instance
    """
    global _embeddings_service
    if _embeddings_service is None:
        _embeddings_service = CodeEmbeddings(model_name=model_name, device=device)
    return _embeddings_service


# LRU cache for issue embeddings
@lru_cache(maxsize=DEFAULT_CACHE_SIZE)
def get_cached_embedding(issue_id: str, text: str) -> Tuple[float, ...]:
    """
    Cache embeddings by issue_id to avoid recomputation for repeated events.

    Args:
        issue_id: Sentry issue ID (used as cache key)
        text: Text to embed

    Returns:
        Tuple of embedding values (tuples are hashable for cache)
    """
    service = get_embeddings_service()
    embedding = service.encode_single(text)
    return tuple(embedding)


def clear_embedding_cache():
    """Clear the embedding cache."""
    get_cached_embedding.cache_clear()
    logger.info("Embedding cache cleared")


def get_embedding_cache_info():
    """Get embedding cache statistics."""
    return get_cached_embedding.cache_info()
