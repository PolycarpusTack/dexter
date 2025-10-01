"""
Tests for monitoring configuration validation.

These tests validate that the Prometheus and Alertmanager 
configuration files are syntactically correct and follow best practices.
"""
import os
import subprocess
import json
import yaml
import pytest
from pathlib import Path

# Get the project root directory
ROOT_DIR = Path(__file__).parent.parent.parent
MONITORING_DIR = ROOT_DIR / "deploy" / "monitoring"

def test_prometheus_config_syntax():
    """Test that the Prometheus configuration is syntactically valid."""
    prometheus_config_path = MONITORING_DIR / "prometheus" / "prometheus.yml"
    
    # Verify file exists
    assert prometheus_config_path.exists(), f"Prometheus config file not found at {prometheus_config_path}"
    
    # Verify file is valid YAML
    with open(prometheus_config_path, 'r') as f:
        try:
            config = yaml.safe_load(f)
            assert isinstance(config, dict), "Prometheus config must be a YAML dictionary"
        except yaml.YAMLError as e:
            pytest.fail(f"Invalid YAML in Prometheus config: {e}")
    
    # Check for required fields
    assert "global" in config, "Missing 'global' section in Prometheus config"
    assert "scrape_configs" in config, "Missing 'scrape_configs' section in Prometheus config"
    
    # Check for reasonable scrape interval
    assert "scrape_interval" in config["global"], "Missing 'scrape_interval' in global section"
    scrape_interval = config["global"]["scrape_interval"]
    # Convert to seconds if in format like "15s"
    if isinstance(scrape_interval, str) and scrape_interval.endswith('s'):
        scrape_interval_seconds = int(scrape_interval[:-1])
        assert 5 <= scrape_interval_seconds <= 60, "Scrape interval should be between 5s and 60s for reasonable performance"

def test_alert_rules_syntax():
    """Test that the alert rules configuration is syntactically valid."""
    alert_rules_path = MONITORING_DIR / "rules" / "alert_rules.yml"
    
    # Verify file exists
    assert alert_rules_path.exists(), f"Alert rules file not found at {alert_rules_path}"
    
    # Verify file is valid YAML
    with open(alert_rules_path, 'r') as f:
        try:
            config = yaml.safe_load(f)
            assert isinstance(config, dict), "Alert rules must be a YAML dictionary"
        except yaml.YAMLError as e:
            pytest.fail(f"Invalid YAML in alert rules: {e}")
    
    # Check for required structure
    assert "groups" in config, "Missing 'groups' section in alert rules"
    assert isinstance(config["groups"], list), "'groups' must be a list in alert rules"
    
    # Check each group
    for i, group in enumerate(config["groups"]):
        assert "name" in group, f"Missing 'name' in alert group {i}"
        assert "rules" in group, f"Missing 'rules' in alert group {i}"
        assert isinstance(group["rules"], list), f"'rules' must be a list in alert group {i}"
        
        # Check each rule
        for j, rule in enumerate(group["rules"]):
            assert "alert" in rule, f"Missing 'alert' name in rule {j} of group {i}"
            assert "expr" in rule, f"Missing 'expr' in rule {j} of group {i}"
            assert "for" in rule, f"Missing 'for' in rule {j} of group {i}"
            assert "labels" in rule, f"Missing 'labels' in rule {j} of group {i}"
            assert "annotations" in rule, f"Missing 'annotations' in rule {j} of group {i}"
            
            # Severity is required
            assert "severity" in rule["labels"], f"Missing 'severity' label in rule {j} of group {i}"

def test_alertmanager_config_syntax():
    """Test that the Alertmanager configuration is syntactically valid."""
    alertmanager_config_path = MONITORING_DIR / "alertmanager.yml"
    
    # Verify file exists
    assert alertmanager_config_path.exists(), f"Alertmanager config file not found at {alertmanager_config_path}"
    
    # Verify file is valid YAML
    with open(alertmanager_config_path, 'r') as f:
        try:
            config = yaml.safe_load(f)
            assert isinstance(config, dict), "Alertmanager config must be a YAML dictionary"
        except yaml.YAMLError as e:
            pytest.fail(f"Invalid YAML in Alertmanager config: {e}")
    
    # Check for required fields
    assert "global" in config, "Missing 'global' section in Alertmanager config"
    assert "route" in config, "Missing 'route' section in Alertmanager config"
    assert "receivers" in config, "Missing 'receivers' section in Alertmanager config"
    
    # Check route configuration
    assert "receiver" in config["route"], "Missing default 'receiver' in route configuration"
    
    # Check receivers configuration
    receivers = config["receivers"]
    assert isinstance(receivers, list), "'receivers' must be a list in Alertmanager config"
    assert len(receivers) > 0, "No receivers defined in Alertmanager config"
    
    # Check for a receiver matching the default receiver
    default_receiver = config["route"]["receiver"]
    matching_receivers = [r for r in receivers if r.get("name") == default_receiver]
    assert len(matching_receivers) > 0, f"Default receiver '{default_receiver}' not found in receivers list"

def test_grafana_dashboards_syntax():
    """Test that Grafana dashboard JSON files are valid."""
    dashboards_dir = MONITORING_DIR / "grafana" / "provisioning" / "dashboards"
    
    # Verify directory exists
    assert dashboards_dir.exists(), f"Grafana dashboards directory not found at {dashboards_dir}"
    
    # Find all JSON files in the dashboards directory
    json_files = list(dashboards_dir.glob('*.json'))
    
    # Ensure we have at least one dashboard
    assert len(json_files) > 0, "No dashboard JSON files found in Grafana dashboards directory"
    
    # Validate each JSON file
    for json_file in json_files:
        with open(json_file, 'r') as f:
            try:
                dashboard = json.load(f)
                assert isinstance(dashboard, dict), f"Dashboard {json_file.name} must be a JSON object"
                
                # Check for basic dashboard properties
                assert "panels" in dashboard, f"Missing 'panels' in dashboard {json_file.name}"
                assert isinstance(dashboard["panels"], list), f"'panels' must be a list in dashboard {json_file.name}"
                
            except json.JSONDecodeError as e:
                pytest.fail(f"Invalid JSON in dashboard {json_file.name}: {e}")

if __name__ == "__main__":
    # This allows running the tests directly with Python for debugging
    test_prometheus_config_syntax()
    test_alert_rules_syntax()
    test_alertmanager_config_syntax()
    test_grafana_dashboards_syntax()
    print("All monitoring configuration tests passed!")