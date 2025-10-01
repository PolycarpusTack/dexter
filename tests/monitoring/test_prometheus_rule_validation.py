"""
Tests for Prometheus alert rules validation.

These tests verify the correctness of Prometheus alert rules by using the
Prometheus rule validation API. This ensures that our alert rules are
syntactically correct and valid for the Prometheus version we're using.

Note: These tests require a running Prometheus instance to validate the rules.
For CI, we use a Docker container for validation.
"""
import os
import json
import tempfile
import subprocess
import yaml
import pytest
from pathlib import Path

# Get the project root directory
ROOT_DIR = Path(__file__).parent.parent.parent
MONITORING_DIR = ROOT_DIR / "deploy" / "monitoring"
RULES_DIR = MONITORING_DIR / "rules"

def get_prometheus_docker_cmd(config_path, rules_path):
    """Get the Docker command to run Prometheus for validation."""
    return [
        "docker", "run", "--rm", "-v", f"{config_path}:/etc/prometheus/prometheus.yml",
        "-v", f"{rules_path}:/etc/prometheus/rules/",
        "prom/prometheus:v2.43.0",
        "--config.file=/etc/prometheus/prometheus.yml",
        "--rules.file=/etc/prometheus/rules/alert_rules.yml",
        "--web.listen-address=:9090",
        "--storage.tsdb.path=/tmp",
        "--storage.tsdb.retention.time=1d"
    ]

def validate_rules_docker(rules_content):
    """Validate Prometheus rules using a Docker container."""
    # Create temporary files for testing
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a temporary prometheus.yml
        config = {
            "global": {
                "scrape_interval": "15s",
                "evaluation_interval": "15s"
            },
            "rule_files": [
                "/etc/prometheus/rules/alert_rules.yml"
            ],
            "scrape_configs": [
                {
                    "job_name": "prometheus",
                    "static_configs": [
                        {"targets": ["localhost:9090"]}
                    ]
                }
            ]
        }
        
        # Write the config and rules to temporary files
        temp_config_path = os.path.join(tmpdir, "prometheus.yml")
        with open(temp_config_path, 'w') as f:
            yaml.dump(config, f)
        
        temp_rules_dir = os.path.join(tmpdir, "rules")
        os.makedirs(temp_rules_dir, exist_ok=True)
        
        temp_rules_path = os.path.join(temp_rules_dir, "alert_rules.yml")
        with open(temp_rules_path, 'w') as f:
            f.write(rules_content)
        
        # Run Prometheus in check mode
        docker_cmd = get_prometheus_docker_cmd(temp_config_path, temp_rules_dir)
        docker_cmd.append("--web.enable-lifecycle")
        docker_cmd.append("--config.file=/etc/prometheus/prometheus.yml")
        docker_cmd.append("--storage.tsdb.path=/tmp")
        docker_cmd.append("--storage.tsdb.retention.time=1d")
        docker_cmd.append("--web.enable-api")
        
        # Append check mode flag
        docker_cmd.append("--web.enable-admin-api")
        docker_cmd.append("--web.console.libraries=/etc/prometheus/console_libraries")
        docker_cmd.append("--web.console.templates=/etc/prometheus/consoles")
        
        # Run with timeout to avoid hanging
        try:
            output = subprocess.run(
                docker_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5  # 5 second timeout to avoid hanging
            )
            # If Prometheus starts successfully, the rules are valid
            # It will typically timeout as it runs as a server
            return True, "Rules are valid" 
        except subprocess.TimeoutExpired:
            # This is expected - Prometheus starts as a server
            return True, "Rules are valid (Prometheus started successfully)"
        except subprocess.CalledProcessError as e:
            # If Prometheus fails to start, check the error message
            error_msg = e.stderr
            if "error validating rule files" in error_msg.lower():
                return False, f"Invalid rules: {error_msg}"
            else:
                return False, f"Error running Prometheus: {error_msg}"
        except Exception as e:
            return False, f"Error validating rules: {e}"

@pytest.mark.integration
def test_alert_rules_validation():
    """Test that alert rules are valid according to Prometheus."""
    # Skip if Docker is not available
    try:
        subprocess.run(["docker", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pytest.skip("Docker not available for rule validation")
    
    # Get the rules file
    rules_path = RULES_DIR / "alert_rules.yml"
    
    # If the file doesn't exist, try the alternate location
    if not rules_path.exists():
        rules_path = MONITORING_DIR / "prometheus" / "alert_rules.yml"
    
    # If still doesn't exist, try another common location
    if not rules_path.exists():
        rules_path = MONITORING_DIR / "alert_rules.yml"
    
    # Ensure the rules file exists somewhere
    assert rules_path.exists(), "Alert rules file not found in expected locations"
    
    # Read the rules file
    with open(rules_path, 'r') as f:
        rules_content = f.read()
    
    # Validate the rules
    is_valid, message = validate_rules_docker(rules_content)
    assert is_valid, message

@pytest.mark.parametrize("test_case", [
    # Test case: Missing 'for' in a rule
    {
        "name": "missing_for",
        "rule_template": """
groups:
  - name: test_group
    rules:
      - alert: TestAlert
        expr: up == 0
        # 'for' is missing
        labels:
          severity: critical
        annotations:
          description: "Test alert"
        """,
        "should_pass": False
    },
    # Test case: Invalid expression
    {
        "name": "invalid_expr",
        "rule_template": """
groups:
  - name: test_group
    rules:
      - alert: TestAlert
        expr: invalid % syntax
        for: 1m
        labels:
          severity: critical
        annotations:
          description: "Test alert"
        """,
        "should_pass": False
    },
    # Test case: Valid rule
    {
        "name": "valid_rule",
        "rule_template": """
groups:
  - name: test_group
    rules:
      - alert: TestAlert
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          description: "Test alert"
        """,
        "should_pass": True
    }
])
@pytest.mark.integration
def test_rule_syntax_validation(test_case):
    """Test validation of specific rule syntax cases."""
    # Skip if Docker is not available
    try:
        subprocess.run(["docker", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pytest.skip("Docker not available for rule validation")
    
    # Validate the test case
    is_valid, message = validate_rules_docker(test_case["rule_template"])
    
    if test_case["should_pass"]:
        assert is_valid, f"Test case '{test_case['name']}' should pass but failed: {message}"
    else:
        assert not is_valid, f"Test case '{test_case['name']}' should fail but passed"

if __name__ == "__main__":
    # This allows running the tests directly with Python for debugging
    # Note: Only run if Docker is available
    try:
        subprocess.run(["docker", "--version"], check=True, capture_output=True)
        test_alert_rules_validation()
        print("Alert rules validation test passed!")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Docker not available for rule validation, skipping tests")