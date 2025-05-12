# File: backend/app/services/llm_service.py

import httpx
from fastapi import HTTPException, status
import logging
from typing import Dict, Any, Optional, List
import json 
import asyncio
import time
from datetime import datetime

from app.core.settings import settings
from ..models.ai import ModelStatus, OllamaModel

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

# Common Ollama models to suggest if none are found
RECOMMENDED_MODELS = [
    "mistral", 
    "mistral:latest", 
    "llama3", 
    "llama3:latest", 
    "codellama", 
    "gemma:latest",
    "phi3:latest"
]

class LLMService:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self.base_url = settings.ollama_base_url.rstrip('/')
        self.model = settings.ollama_model
        self.timeout = settings.ollama_timeout  # Get timeout from settings
        logger.info(f"LLM Service initialized for Ollama URL: {self.base_url} using model: {self.model} with timeout: {self.timeout}s")
        
    async def list_models(self) -> Dict[str, Any]:
        """Scan for available Ollama models and their status."""
        # First, check if Ollama is available at all
        ollama_status = ModelStatus.ERROR
        error_message = None
        models_list = []
        
        try:
            # Check Ollama server connectivity
            logger.info(f"Checking Ollama server status at {self.base_url}")
            response = await self.client.get(f"{self.base_url}/api/version", timeout=5.0)
            response.raise_for_status()
            logger.info(f"Ollama server is available: {response.json()}")
            ollama_status = ModelStatus.AVAILABLE
            
            # Get list of available models
            models_response = await self.client.get(f"{self.base_url}/api/tags", timeout=10.0)
            models_response.raise_for_status()
            
            # Process model list
            models_data = models_response.json()
            if "models" in models_data and isinstance(models_data["models"], list):
                for model in models_data["models"]:
                    models_list.append(
                        OllamaModel(
                            name=model.get("name", "unknown"),
                            status=ModelStatus.AVAILABLE,
                            size=model.get("size", 0),
                            modified_at=model.get("modified_at", None),
                            details=model
                        )
                    )
                    
                # Add recommended models that aren't installed
                installed_model_names = [model.name for model in models_list]
                for recommended_model in RECOMMENDED_MODELS:
                    if recommended_model not in installed_model_names:
                        models_list.append(
                            OllamaModel(
                                name=recommended_model,
                                status=ModelStatus.UNAVAILABLE
                            )
                        )
            
            # Check if current model is in the list
            current_model_exists = any(model.name == self.model for model in models_list)
            if not current_model_exists:
                models_list.append(
                    OllamaModel(
                        name=self.model,
                        status=ModelStatus.UNAVAILABLE,
                        error="This model is set as default but not installed."
                    )
                )
                
        except httpx.TimeoutException:
            ollama_status = ModelStatus.ERROR
            error_message = "Connection to Ollama timed out."
            logger.error(f"Timeout connecting to Ollama at {self.base_url}")
            
            # Add some recommended models in offline mode
            for model_name in RECOMMENDED_MODELS:
                models_list.append(
                    OllamaModel(
                        name=model_name,
                        status=ModelStatus.UNAVAILABLE,
                        error="Ollama server unavailable."
                    )
                )
                
        except httpx.RequestError as e:
            ollama_status = ModelStatus.ERROR
            error_message = f"Cannot connect to Ollama: {str(e)}"
            logger.error(f"Error connecting to Ollama at {self.base_url}: {e}")
            
            # Add some recommended models in offline mode
            for model_name in RECOMMENDED_MODELS:
                models_list.append(
                    OllamaModel(
                        name=model_name,
                        status=ModelStatus.UNAVAILABLE,
                        error="Ollama server unavailable."
                    )
                )
                
        except Exception as e:
            ollama_status = ModelStatus.ERROR
            error_message = f"Unexpected error: {str(e)}"
            logger.exception(f"Unexpected error checking Ollama models: {e}")
            
            # Add some recommended models in offline mode
            for model_name in RECOMMENDED_MODELS:
                models_list.append(
                    OllamaModel(
                        name=model_name,
                        status=ModelStatus.UNAVAILABLE,
                        error="Ollama server unavailable."
                    )
                )
                
        return {
            "models": models_list,
            "current_model": self.model,
            "ollama_status": ollama_status,
            "error": error_message
        }
        
    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Initiate a pull request for a model. Returns immediately, does not wait for completion."""
        try:
            logger.info(f"Initiating pull for model {model_name}")
            # This is a non-blocking call, as model pulling can take a long time
            response = await self.client.post(
                f"{self.base_url}/api/pull", 
                json={"name": model_name},
                timeout=10.0  # Just for initial request, not the full download
            )
            response.raise_for_status()
            
            # Return a status indication
            return {
                "status": "downloading",
                "message": f"Started downloading model: {model_name}. Check status later.",
                "name": model_name,
                "estimated_time": self._estimate_download_time(model_name)
            }
            
        except Exception as e:
            logger.exception(f"Error initiating model pull: {e}")
            return {
                "status": "error",
                "message": f"Failed to start model download: {str(e)}",
                "name": model_name
            }
            
    def _estimate_download_time(self, model_name: str) -> str:
        """Provide a rough estimate of download time based on model name."""
        # These are very rough estimates and will vary greatly by connection speed
        if "mixtral" in model_name:
            return "30-60 minutes"
        elif "llama3" in model_name:
            return "15-30 minutes"
        elif "codellama" in model_name:
            return "20-40 minutes"
        elif "phi3" in model_name or "mistral" in model_name or "gemma" in model_name:
            return "10-20 minutes"
        else:
            return "10-60 minutes"
            
    async def set_active_model(self, model_name: str) -> Dict[str, Any]:
        """
        Change the active model for explanations.
        
        In a real production app, this would update a database setting.
        For this MVP, we're just updating the in-memory value.
        """
        logger.info(f"Changing active model from {self.model} to {model_name}")
        self.model = model_name
        return {
            "status": "success",
            "model": model_name,
            "message": f"Active model changed to {model_name}"
        }
        
    def _extract_error_context(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant error context from the event data"""
        context = {
            "title": event_data.get("title", "Unknown Error"),
            "level": event_data.get("level", "error"),
            "platform": event_data.get("platform", "unknown"),
            "message": event_data.get("message", ""),
            "exception_type": None,
            "exception_value": None,
            "stack_frames": [],
            "tags": [],
            "browser": None,
            "os": None,
            "device": None,
            "user_count": event_data.get("userCount", 0)
        }
        
        # Extract exception details
        exception_found = False
        # Method 1: Direct exception field
        if "exception" in event_data:
            exception_data = event_data["exception"]
            if isinstance(exception_data, dict) and "values" in exception_data:
                exception_values = exception_data["values"]
                if len(exception_values) > 0:
                    exception_found = True
                    first_exception = exception_values[0]
                    context["exception_type"] = first_exception.get("type")
                    context["exception_value"] = first_exception.get("value")
                    
                    # Extract stack frames for context
                    if "stacktrace" in first_exception and "frames" in first_exception["stacktrace"]:
                        frames = first_exception["stacktrace"]["frames"]
                        # Focus on app frames (more relevant than library frames)
                        app_frames = [f for f in frames if f.get("inApp", False)]
                        # If no app frames, use some library frames
                        relevant_frames = app_frames if app_frames else frames[-3:] if len(frames) >= 3 else frames
                        
                        for frame in relevant_frames:
                            frame_info = {
                                "filename": frame.get("filename", "unknown"),
                                "function": frame.get("function", "unknown"),
                                "line": frame.get("lineno", "?"),
                                "column": frame.get("colno", "?"),
                                "code_context": None
                            }
                            
                            # Extract code context if available
                            if "context" in frame and isinstance(frame["context"], dict):
                                code_lines = []
                                for line_num, code in frame["context"].items():
                                    code_lines.append(f"{line_num}: {code}")
                                frame_info["code_context"] = "\n".join(code_lines)
                            
                            context["stack_frames"].append(frame_info)
        
        # Method 2: Look in entries
        if not exception_found and "entries" in event_data and isinstance(event_data["entries"], list):
            for entry in event_data["entries"]:
                if entry.get("type") == "exception" and "data" in entry:
                    exception_data = entry["data"]
                    if "values" in exception_data and len(exception_data["values"]) > 0:
                        exception_found = True
                        first_exception = exception_data["values"][0]
                        context["exception_type"] = first_exception.get("type")
                        context["exception_value"] = first_exception.get("value")
                        
                        # Extract stack frames
                        if "stacktrace" in first_exception and "frames" in first_exception["stacktrace"]:
                            frames = first_exception["stacktrace"]["frames"]
                            # Focus on app frames (more relevant than library frames)
                            app_frames = [f for f in frames if f.get("inApp", False)]
                            # If no app frames, use some library frames
                            relevant_frames = app_frames if app_frames else frames[-3:] if len(frames) >= 3 else frames
                            
                            for frame in relevant_frames:
                                frame_info = {
                                    "filename": frame.get("filename", "unknown"),
                                    "function": frame.get("function", "unknown"),
                                    "line": frame.get("lineno", "?"),
                                    "column": frame.get("colno", "?"),
                                    "code_context": None
                                }
                                
                                # Extract code context if available
                                if "context" in frame and isinstance(frame["context"], dict):
                                    code_lines = []
                                    for line_num, code in frame["context"].items():
                                        code_lines.append(f"{line_num}: {code}")
                                    frame_info["code_context"] = "\n".join(code_lines)
                                
                                context["stack_frames"].append(frame_info)
        
        # Extract tags
        if "tags" in event_data and isinstance(event_data["tags"], list):
            context["tags"] = [{"key": tag.get("key", ""), "value": tag.get("value", "")} for tag in event_data["tags"]]
        
        # Extract browser/OS/device info
        if "contexts" in event_data and isinstance(event_data["contexts"], dict):
            contexts = event_data["contexts"]
            if "browser" in contexts:
                context["browser"] = {
                    "name": contexts["browser"].get("name", "unknown"),
                    "version": contexts["browser"].get("version", "unknown")
                }
            if "os" in contexts:
                context["os"] = {
                    "name": contexts["os"].get("name", "unknown"),
                    "version": contexts["os"].get("version", "unknown")
                }
            if "device" in contexts:
                context["device"] = {
                    "name": contexts["device"].get("name", "unknown"),
                    "family": contexts["device"].get("family", "unknown"),
                    "model": contexts["device"].get("model", "unknown")
                }
                
        # Extract any request information
        request_info = None
        if "request" in event_data and isinstance(event_data["request"], dict):
            request_info = event_data["request"]
        elif "contexts" in event_data and "request" in event_data["contexts"]:
            request_info = event_data["contexts"]["request"]
            
        if request_info:
            context["request"] = {
                "url": request_info.get("url", ""),
                "method": request_info.get("method", ""),
                "headers": request_info.get("headers", {}),
                "data": request_info.get("data", {})
            }
        
        return context

    def _create_prompt(self, event_data: Dict[str, Any]) -> str:
        """Create a more detailed and structured prompt for the LLM"""
        context = self._extract_error_context(event_data)
        
        # Create a structured prompt
        prompt = "You are an expert software engineer. I'm going to share details of an error and I need you to explain:\n"
        prompt += "1. What likely caused this error in simple terms\n"
        prompt += "2. How to fix or work around it\n"
        prompt += "3. Any additional context that might be helpful\n\n"
        
        prompt += f"ERROR TITLE: {context['title']}\n"
        prompt += f"ERROR LEVEL: {context['level']}\n"
        prompt += f"PLATFORM: {context['platform']}\n"
        
        if context['message']:
            prompt += f"\nERROR MESSAGE:\n{context['message']}\n"
        
        if context['exception_type'] or context['exception_value']:
            prompt += f"\nEXCEPTION DETAILS:\n"
            if context['exception_type']:
                prompt += f"Type: {context['exception_type']}\n"
            if context['exception_value']:
                prompt += f"Value: {context['exception_value']}\n"
        
        if context['stack_frames']:
            prompt += f"\nRELEVANT STACK FRAMES ({len(context['stack_frames'])}):\n"
            for i, frame in enumerate(context['stack_frames'], 1):
                prompt += f"Frame {i}:\n"
                prompt += f"  File: {frame['filename']}\n"
                prompt += f"  Function: {frame['function']}\n"
                prompt += f"  Line: {frame['line']}, Column: {frame['column']}\n"
                if frame['code_context']:
                    prompt += f"  Code:\n    {frame['code_context'].replace('\n', '\n    ')}\n"
        
        # Add request information if available
        if 'request' in context and context['request']:
            prompt += "\nREQUEST DETAILS:\n"
            if context['request'].get('url'):
                prompt += f"  URL: {context['request']['url']}\n"
            if context['request'].get('method'):
                prompt += f"  Method: {context['request']['method']}\n"
            
            # Add relevant headers (without sensitive info)
            safe_headers = {}
            if context['request'].get('headers'):
                headers = context['request']['headers']
                for key, value in headers.items():
                    if key.lower() not in ['authorization', 'cookie', 'password', 'token']:
                        safe_headers[key] = value
                        
            if safe_headers:
                prompt += "  Headers:\n"
                for key, value in safe_headers.items():
                    prompt += f"    {key}: {value}\n"
        
        # Add relevant tags
        relevant_tags = [tag for tag in context['tags'] if tag['key'] in 
                         ['runtime', 'environment', 'browser', 'os', 'release', 'level', 'logger']]
        if relevant_tags:
            prompt += "\nRELEVANT TAGS:\n"
            for tag in relevant_tags:
                prompt += f"  {tag['key']}: {tag['value']}\n"
        
        # Add environment context
        env_context = []
        if context['browser']:
            env_context.append(f"Browser: {context['browser']['name']} {context['browser']['version']}")
        if context['os']:
            env_context.append(f"OS: {context['os']['name']} {context['os']['version']}")
        if context['device']:
            env_context.append(f"Device: {context['device']['name']} {context['device']['model']}")
        
        if env_context:
            prompt += "\nENVIRONMENT:\n  " + "\n  ".join(env_context) + "\n"
        
        # Add user impact
        if context['user_count'] > 0:
            prompt += f"\nUser Impact: This error affects approximately {context['user_count']} users.\n"
        
        # Final instructions
        prompt += "\nPlease provide a clear, concise explanation in 3-4 paragraphs. Use simple language and avoid technical jargon where possible. Focus on explaining the likely cause and potential solutions."
        
        logger.debug(f"Generated LLM Prompt:\n{prompt}")
        return prompt

    async def get_explanation(self, event_data: Dict[str, Any], override_model: Optional[str] = None) -> str:
        """Sends event data to the LLM via Ollama API and returns the explanation."""
        # Use override model if provided
        model_to_use = override_model if override_model else self.model
        
        prompt = self._create_prompt(event_data)
        ollama_api_url = f"{self.base_url}/api/generate"
        payload = {"model": model_to_use, "prompt": prompt, "stream": False}
        event_id_log = event_data.get('eventID', 'N/A') # For logging

        try:
            logger.info(f"Sending request to Ollama ({ollama_api_url}) for event {event_id_log} using model: {model_to_use}")
            response = await self.client.post(ollama_api_url, json=payload, timeout=float(self.timeout))
            response.raise_for_status() # Check for 4xx/5xx errors FIRST

            # Safely parse JSON
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                 logger.error(f"Ollama returned non-JSON response ({response.status_code}) for event {event_id_log}. Response text: {response.text[:500]}")
                 raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM service returned invalid response.")

            explanation = response_data.get("response", "").strip()
            logger.info(f"Received explanation from Ollama for event {event_id_log} (length: {len(explanation)} chars)")

            if response_data.get("error"):
                 # Ollama might return 200 OK but include an error in the JSON body
                 ollama_error = response_data["error"]
                 logger.error(f"Ollama returned error in successful response body for event {event_id_log}: {ollama_error}")
                 raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM service error: {ollama_error}")

            if not explanation:
                 logger.warning(f"Ollama returned an empty explanation for event {event_id_log}.")
                 raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="LLM returned an empty explanation.")

            # Apply some cleanup to the explanation if needed
            explanation = explanation.replace("Here's an explanation:", "").strip()
            explanation = explanation.replace("Here is an explanation:", "").strip()
            
            return explanation

        except httpx.TimeoutException as e:
            logger.error(f"Ollama API request timed out after {self.timeout}s for event {event_id_log}: {ollama_api_url} - {e}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT, 
                detail=f"Request to LLM service timed out after {self.timeout} seconds. Try a smaller model or increase the timeout."
            )
        except httpx.RequestError as e:
            # Connection errors - likely Ollama is not running
            logger.error(f"Ollama API connection error for event {event_id_log}: {ollama_api_url} - {e}")
            
            # Special handling for common connection issues
            if isinstance(e, httpx.ConnectError):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                    detail=f"Could not connect to LLM service (Ollama). Make sure Ollama is running at {self.base_url}."
                )
            
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail=f"Could not connect to LLM service (Ollama): {type(e).__name__}"
            )
        except httpx.HTTPStatusError as e:
            # Log details from the response body if possible
            error_detail = f"LLM service error: {e.response.status_code}"
            try:
                 # Try parsing Ollama's specific error format
                 ollama_error_body = e.response.json()
                 ollama_error = ollama_error_body.get("error", e.response.text[:200]) # Use text as fallback
                 error_detail = f"LLM service error: {e.response.status_code} - {ollama_error}"
                 
                 # Special handling for common errors
                 if "model not found" in ollama_error.lower():
                     error_detail = f"Model '{model_to_use}' not found in Ollama. Run 'ollama pull {model_to_use}' to install it."
                 elif "no model with name" in ollama_error.lower():
                     error_detail = f"Model '{model_to_use}' not available. Run 'ollama pull {model_to_use}' to install it."
                     
            except json.JSONDecodeError:
                 error_detail += f" - Response: {e.response.text[:200]}" # Log non-JSON response start

            logger.error(f"Ollama API HTTP error for event {event_id_log}: {error_detail} | URL: {e.request.url}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_detail)
        except HTTPException:
             # Re-raise HTTPExceptions we threw deliberately (like empty explanation)
             raise
        except Exception as e:
            logger.exception(f"Unexpected error interacting with LLM service for event {event_id_log}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error generating explanation.")
            
    async def get_fallback_explanation(self, error_type: str, error_message: str) -> str:
        """Provides a generic explanation when Ollama is unavailable"""
        # Dictionary of common error types and generic explanations
        common_errors = {
            "SyntaxError": "This is a syntax error, which means there's a mistake in the code structure like a missing bracket, comma, or incorrect indentation. These errors happen before the code runs and need to be fixed by correcting the syntax.",
            
            "TypeError": "This is a type error, which happens when an operation is performed on a value of the wrong type - like trying to use a string method on a number. Check what data types you're working with and ensure they're compatible with the operations you're performing.",
            
            "ReferenceError": "This is a reference error, which occurs when the code tries to use a variable or function that doesn't exist or is out of scope. Make sure all variables and functions are properly defined before using them.",
            
            "NetworkError": "This is a network error, which happens when there's a problem with the network connection or a server request fails. Check your internet connection and the server's status, or try again later if it's a temporary issue.",
            
            "InternalServerError": "This is a server error (HTTP 500), which indicates something went wrong on the server side. The issue is likely in the server code or configuration and may require checking server logs to diagnose.",
            
            "ForbiddenError": "This is a permission error (HTTP 403), which means the request was valid but the server refuses to allow the requested action. Check if you have the necessary permissions or authentication to access this resource.",
            
            "ConnectionError": "This is a connection error, which occurs when the application can't establish a connection to a server or resource. Check if the server is running and accessible, and verify your network configuration.",
            
            "DatabaseError": "This is a database error, which happens when there's a problem interacting with a database. Common causes include connection issues, incorrect queries, or data integrity problems.",
            
            "MemoryError": "This is a memory error, which occurs when the application runs out of memory. This can happen when handling very large datasets or when there are memory leaks in the code.",
            
            "TimeoutError": "This is a timeout error, which happens when an operation takes too long to complete. This could be due to network issues, server overload, or an operation that's too resource-intensive."
        }
        
        # Try to match the error type to our dictionary
        for known_error, explanation in common_errors.items():
            if known_error.lower() in error_type.lower():
                return f"{explanation}\n\nSpecific error message: {error_message}"
        
        # Generic fallback
        return f"This error ({error_type}) indicates an issue in the application. The specific message is: '{error_message}'. To resolve it, check the related code and look for common issues like incorrect input data, missing values, or configuration problems."