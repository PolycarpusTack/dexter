import pytest
from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from app.middleware.error_handler import (
    ErrorHandler,
    APIError,
    ErrorCategory,
    ErrorCode,
    not_found_error,
    validation_error,
    permission_error,
    authentication_error,
    server_error
)


@pytest.fixture
def error_handler():
    return ErrorHandler()


class TestErrorHandler:
    """Test suite for ErrorHandler class."""
    
    def test_categorize_api_error(self, error_handler):
        """Test error categorization for APIError."""
        api_error = APIError(
            message="Test error",
            category=ErrorCategory.AUTHENTICATION,
            error_code=ErrorCode.INVALID_TOKEN
        )
        assert error_handler.categorize_error(api_error) == ErrorCategory.AUTHENTICATION
    
    def test_categorize_http_exception(self, error_handler):
        """Test error categorization for HTTPException."""
        # Authentication error
        http_401 = HTTPException(status_code=401)
        assert error_handler.categorize_error(http_401) == ErrorCategory.AUTHENTICATION
        
        # Not found error
        http_404 = HTTPException(status_code=404)
        assert error_handler.categorize_error(http_404) == ErrorCategory.NOT_FOUND
        
        # Validation error
        http_422 = HTTPException(status_code=422)
        assert error_handler.categorize_error(http_422) == ErrorCategory.VALIDATION
        
        # Server error
        http_500 = HTTPException(status_code=500)
        assert error_handler.categorize_error(http_500) == ErrorCategory.SERVER
    
    def test_get_error_code(self, error_handler):
        """Test getting error codes for different error types."""
        # APIError
        api_error = APIError(
            message="Test",
            error_code=ErrorCode.INVALID_INPUT
        )
        assert error_handler.get_error_code(api_error) == ErrorCode.INVALID_INPUT
        
        # HTTPException
        http_401 = HTTPException(status_code=401)
        assert error_handler.get_error_code(http_401) == ErrorCode.INVALID_TOKEN
        
        http_404 = HTTPException(status_code=404)
        assert error_handler.get_error_code(http_404) == ErrorCode.NOT_FOUND
    
    def test_format_error_response(self, error_handler):
        """Test error response formatting."""
        # Create a mock request
        class MockRequest:
            def __init__(self):
                self.url = type('obj', (object,), {'path': '/test/path'})
                self.method = 'GET'
                self.headers = {'X-Request-ID': 'test-123'}
        
        request = MockRequest()
        error = APIError(
            message="Test error message",
            status_code=400,
            error_code=ErrorCode.INVALID_INPUT,
            category=ErrorCategory.VALIDATION,
            details={"field": "test_field"}
        )
        
        response, status_code = error_handler.format_error_response(error, request)
        
        assert status_code == 400
        assert response["error"]["message"] == "Test error message"
        assert response["error"]["code"] == ErrorCode.INVALID_INPUT
        assert response["error"]["category"] == ErrorCategory.VALIDATION.value
        assert response["error"]["details"]["field"] == "test_field"
        assert response["error"]["path"] == "/test/path"
        assert response["error"]["method"] == "GET"
    
    def test_get_user_friendly_message(self, error_handler):
        """Test user-friendly message generation."""
        # APIError with custom message
        api_error = APIError(message="Custom error message")
        assert error_handler.get_user_friendly_message(api_error) == "Custom error message"
        
        # HTTPException
        http_error = HTTPException(status_code=404, detail="Not found")
        assert error_handler.get_user_friendly_message(http_error) == "Not found"
        
        # Connection error
        conn_error = ConnectionError()
        message = error_handler.get_user_friendly_message(conn_error)
        assert "Unable to connect to external service" in message
    
    def test_error_log_management(self, error_handler):
        """Test error log functionality."""
        # Create a mock request
        class MockRequest:
            def __init__(self):
                self.url = type('obj', (object,), {'path': '/test'})
                self.method = 'GET'
                self.headers = {}
                self.query_params = {}
                self.client = type('obj', (object,), {'host': '127.0.0.1'})
        
        request = MockRequest()
        error = APIError(message="Test error", category=ErrorCategory.SERVER)
        
        # Log an error
        error_handler.log_error(error, request, 500)
        
        # Check error log
        log = error_handler.get_error_log(limit=1)
        assert len(log) == 1
        assert log[0]["error_message"] == "Test error"
        assert log[0]["category"] == ErrorCategory.SERVER.value
        
        # Test filtering by category
        server_errors = error_handler.get_errors_by_category(ErrorCategory.SERVER)
        assert len(server_errors) == 1
        
        # Clear log
        error_handler.clear_error_log()
        assert len(error_handler.get_error_log()) == 0


class TestErrorCreators:
    """Test error creator functions."""
    
    def test_not_found_error(self):
        """Test not_found_error creation."""
        error = not_found_error("User", "123")
        assert error.status_code == 404
        assert error.error_code == ErrorCode.NOT_FOUND
        assert error.category == ErrorCategory.NOT_FOUND
        assert "User with ID '123' not found" in error.message
    
    def test_validation_error(self):
        """Test validation_error creation."""
        error = validation_error("email", "Invalid email format")
        assert error.status_code == 422
        assert error.error_code == ErrorCode.INVALID_INPUT
        assert error.category == ErrorCategory.VALIDATION
        assert "Invalid email format" in error.message
    
    def test_permission_error(self):
        """Test permission_error creation."""
        error = permission_error("delete", "user")
        assert error.status_code == 403
        assert error.error_code == ErrorCode.INSUFFICIENT_PERMISSIONS
        assert error.category == ErrorCategory.PERMISSION
        assert "delete user" in error.message
    
    def test_authentication_error(self):
        """Test authentication_error creation."""
        error = authentication_error()
        assert error.status_code == 401
        assert error.error_code == ErrorCode.INVALID_TOKEN
        assert error.category == ErrorCategory.AUTHENTICATION
        
        # Custom message
        error_custom = authentication_error("Token expired")
        assert error_custom.message == "Token expired"
    
    def test_server_error(self):
        """Test server_error creation."""
        error = server_error()
        assert error.status_code == 500
        assert error.error_code == ErrorCode.INTERNAL_ERROR
        assert error.category == ErrorCategory.SERVER
        assert error.retryable is True
        
        # Custom message and retryable
        error_custom = server_error("Database connection failed", retryable=False)
        assert error_custom.message == "Database connection failed"
        assert error_custom.retryable is False
