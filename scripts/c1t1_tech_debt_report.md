# Technical Debt Report for C-1-T1 (Integration Framework)

Total issues found: 69


## Unused Imports (28 issues)

- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'TokenExpiredError'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'OAuth2Credentials'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'Dict'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'Any'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'RateLimitError'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'ConnectorRegistry'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'ConnectorError'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'AuthError'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'BaseConnector'
- /mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py: Unused import 'Union'
  ... and 18 more

## Todos Fixmes (12 issues)

- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:43 - TODO: """TODO: Add docstring for __init__."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:71 - TODO: """TODO: Add docstring for validate_max_retries."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:85 - TODO: """TODO: Add docstring for validate_bucket_size."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:92 - TODO: """TODO: Add docstring for validate_refill_rate."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:108 - TODO: """TODO: Add docstring for validate_max_connections."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:199 - TODO: """TODO: Add docstring for __init__."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:235 - TODO: """TODO: Add docstring for State class."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:241 - TODO: """TODO: Add docstring for __init__."""
- /mnt/c/Projects/dexter/backend/app/services/integrations/connector_registry.py:55 - TODO: """TODO: Add docstring for register_connector."""
- /mnt/c/Projects/dexter/backend/app/services/integration_service.py:390 - TODO: Add proper error handling
  ... and 2 more

## Magic Values (18 issues)

- /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py:168 - hardcoded number > 1000: iterations=100000,...
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:3 - hardcoded number > 1000: DEFAULT_TIMEOUT_SECONDS = 3600...
- /mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py:4 - hardcoded number > 1000: MS_PER_SECOND = 1000...
- /mnt/c/Projects/dexter/backend/app/services/integration_service.py:213 - hardcoded number > 1000: response_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000...
- /mnt/c/Projects/dexter/backend/app/services/integration_service.py:358 - hardcoded number > 1000: sync_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000...
- /mnt/c/Projects/dexter/backend/tests/services/test_integration_service.py:41 - hardcoded URL: "base_url": "https://api.example.com",...
- /mnt/c/Projects/dexter/backend/tests/services/test_integration_service.py:86 - hardcoded URL: config={"webhook_url": "https://hooks.slack.com/test"},...
- /mnt/c/Projects/dexter/backend/tests/services/test_integration_service.py:132 - hardcoded URL: new_config = {"base_url": "https://new-api.example.com", "api_token": "new-token...
- /mnt/c/Projects/dexter/backend/tests/services/test_integration_service.py:139 - hardcoded URL: assert updated.config["base_url"] == "https://new-api.example.com"...
- /mnt/c/Projects/dexter/backend/tests/services/test_integration_service.py:328 - hardcoded URL: "base_url": "https://jira.example.com",...
  ... and 8 more

## Missing Type Hints (7 issues)

- /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py:118 - Function 'parse_expires_at': missing parameter type
- /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py:118 - Function 'parse_expires_at': missing parameter type
- /mnt/c/Projects/dexter/backend/app/models/integrations.py:85 - Function 'mask_sensitive_fields': missing parameter type
- /mnt/c/Projects/dexter/backend/app/models/integrations.py:85 - Function 'mask_sensitive_fields': missing parameter type
- /mnt/c/Projects/dexter/backend/app/routers/integrations.py:65 - Function 'validate_config_fields': missing parameter type
- /mnt/c/Projects/dexter/backend/app/routers/integrations.py:65 - Function 'validate_config_fields': missing parameter type
- /mnt/c/Projects/dexter/backend/app/routers/integrations.py:65 - Function 'validate_config_fields': missing parameter type

## Code Duplication (4 issues)

- Duplicate function 'apply_to_request' in /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py and /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py
- Duplicate function 'apply_to_request' in /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py and /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py
- Duplicate function 'apply_to_request' in /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py and /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py
- Duplicate function '__init__' in /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py and /mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py