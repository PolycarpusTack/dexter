"""
Application Constants
Centralized constant values for the Dexter backend application.
"""

# HTTP Status Codes (commonly used)
HTTP_OK = 200
HTTP_CREATED = 201
HTTP_ACCEPTED = 202
HTTP_NO_CONTENT = 204
HTTP_BAD_REQUEST = 400
HTTP_UNAUTHORIZED = 401
HTTP_FORBIDDEN = 403
HTTP_NOT_FOUND = 404
HTTP_METHOD_NOT_ALLOWED = 405
HTTP_CONFLICT = 409
HTTP_UNPROCESSABLE_ENTITY = 422
HTTP_TOO_MANY_REQUESTS = 429
HTTP_INTERNAL_SERVER_ERROR = 500
HTTP_BAD_GATEWAY = 502
HTTP_SERVICE_UNAVAILABLE = 503
HTTP_GATEWAY_TIMEOUT = 504

# Timeout Values (in seconds)
DEFAULT_REQUEST_TIMEOUT = 30
REDIS_CONNECT_TIMEOUT = 5
REDIS_SOCKET_TIMEOUT = 5
OLLAMA_STATUS_CHECK_TIMEOUT = 5.0
SENTRY_API_TIMEOUT = 30
LLM_REQUEST_TIMEOUT = 300

# Cache TTL Values (in seconds)
CACHE_TTL_SHORT = 60  # 1 minute
CACHE_TTL_MEDIUM = 300  # 5 minutes
CACHE_TTL_LONG = 900  # 15 minutes
CACHE_TTL_HOUR = 3600  # 1 hour
CACHE_TTL_DAY = 86400  # 24 hours

# Rate Limiting
RATE_LIMIT_DEFAULT = 100  # requests per window
RATE_LIMIT_WINDOW = 60  # seconds

# Pagination
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100
MIN_PAGE_SIZE = 1

# Redis Configuration
REDIS_HEALTH_CHECK_INTERVAL = 30  # seconds

# Token Configuration
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Retry Configuration
MAX_RETRIES = 3
RETRY_DELAY_BASE = 1  # seconds
RETRY_BACKOFF_FACTOR = 2

# File Size Limits (in bytes)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
MAX_LOG_SIZE = 10 * 1024 * 1024  # 10MB

# Batch Processing
DEFAULT_BATCH_SIZE = 50
MAX_BATCH_SIZE = 100

# Monitoring
METRICS_COLLECTION_INTERVAL = 60  # seconds
HEALTH_CHECK_INTERVAL = 30  # seconds

# Confidence Thresholds (0.0 - 1.0)
CONFIDENCE_HIGH = 0.9  # High confidence threshold
CONFIDENCE_MEDIUM_HIGH = 0.7  # Medium-high confidence threshold
CONFIDENCE_MEDIUM = 0.5  # Medium confidence threshold
CONFIDENCE_LOW = 0.3  # Low confidence threshold

# Confidence Increments (for scoring)
CONFIDENCE_INCREMENT_HIGH = 0.2
CONFIDENCE_INCREMENT_MEDIUM = 0.1
CONFIDENCE_INCREMENT_LOW = 0.05

# Analysis Thresholds
ASYNC_INDICATOR_THRESHOLD = 3  # Minimum async operations to trigger analysis
ERROR_RATE_THRESHOLD = 0.1  # 10% error rate threshold
GROWTH_RATE_HIGH_CONFIDENCE = 100  # Objects per minute for high confidence leak detection
DURATION_HIGH_CONFIDENCE = 30  # Minutes for high confidence leak detection
DATA_VOLUME_CONFIDENCE_BASELINE = 1000  # Sample size for high confidence statistics

# Cache Limits
MAX_CACHE_SIZE = 1000  # Maximum number of cache entries
MAX_USER_PRESENCE = 1000  # Maximum user presence entries

# Test Timeout
QUICK_TEST_TIMEOUT = 10.0  # Quick timeout for connection tests (seconds)
