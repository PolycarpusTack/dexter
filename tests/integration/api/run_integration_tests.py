import asyncio
import os
import sys
import time
from pathlib import Path

# Add parent directory to path so we can import the test modules
current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
sys.path.append(str(parent_dir))

from integration.api.test_harness import ApiTestHarness
from integration.api.test_issue_api import (
    test_issue_list_endpoint,
    test_issue_detail_endpoint,
    test_issue_update_endpoint,
    test_issue_delete_endpoint,
    test_bulk_update_endpoint,
    test_issue_assignment_endpoint,
)
from integration.api.test_event_api import (
    test_event_list_endpoint,
    test_event_detail_endpoint, 
    test_issue_events_endpoint,
    test_latest_event_endpoint,
    test_event_tag_values_endpoint,
)
from integration.api.test_discover_api import (
    test_discover_query_endpoint,
    test_discover_saved_queries_endpoint,
    test_discover_create_saved_query_endpoint,
    test_discover_saved_query_detail_endpoint,
    test_discover_delete_saved_query_endpoint,
)
from integration.api.test_alert_rules_api import (
    test_alert_rules_list_endpoint,
    test_alert_rule_detail_endpoint,
    test_create_alert_rule_endpoint,
    test_update_alert_rule_endpoint,
    test_delete_alert_rule_endpoint,
)

async def run_all_tests():
    """Run all API integration tests and generate a report"""
    print("Starting API integration tests...")
    start_time = time.time()
    
    # Create a test harness
    harness = ApiTestHarness()
    
    # Run path resolution test first
    print("\nTesting path resolution...")
    api_config = harness.api_config
    all_endpoints = api_config.get_all_endpoints()
    
    resolution_success = True
    for category, endpoints in all_endpoints.items():
        for endpoint_key, config in endpoints.items():
            # Generate test parameters
            path_params = {}
            for param in harness._extract_path_params(config.get("backend_path", "")):
                if param == "org":
                    path_params[param] = "test-org"
                elif param == "project":
                    path_params[param] = "test-project"
                elif param == "id":
                    path_params[param] = "1234"
                else:
                    path_params[param] = f"test-{param}"
            
            # Try to resolve the path
            full_key = f"{category}.{endpoint_key}"
            try:
                path = api_config.resolve_path(full_key, path_params)
                print(f"✓ {full_key} -> {path}")
            except Exception as e:
                print(f"✗ {full_key} - Error: {str(e)}")
                resolution_success = False
    
    if not resolution_success:
        print("WARNING: Some paths could not be resolved. API tests may fail.")
    
    # Run all the tests
    print("\nRunning API endpoint tests...")
    
    # Issues API tests
    print("\nIssues API tests:")
    await test_issue_list_endpoint(harness)
    await test_issue_detail_endpoint(harness)
    await test_issue_update_endpoint(harness)
    await test_issue_delete_endpoint(harness)
    await test_bulk_update_endpoint(harness)
    await test_issue_assignment_endpoint(harness)
    
    # Events API tests
    print("\nEvents API tests:")
    await test_event_list_endpoint(harness)
    await test_event_detail_endpoint(harness)
    await test_issue_events_endpoint(harness)
    await test_latest_event_endpoint(harness)
    await test_event_tag_values_endpoint(harness)
    
    # Discover API tests
    print("\nDiscover API tests:")
    await test_discover_query_endpoint(harness)
    await test_discover_saved_queries_endpoint(harness)
    await test_discover_create_saved_query_endpoint(harness)
    await test_discover_saved_query_detail_endpoint(harness)
    await test_discover_delete_saved_query_endpoint(harness)
    
    # Alert Rules API tests
    print("\nAlert Rules API tests:")
    await test_alert_rules_list_endpoint(harness)
    await test_alert_rule_detail_endpoint(harness)
    await test_create_alert_rule_endpoint(harness)
    await test_update_alert_rule_endpoint(harness)
    await test_delete_alert_rule_endpoint(harness)
    
    # Generate and save report
    report = harness.generate_report()
    
    # Save report to file
    report_path = os.path.join(current_dir, "integration_test_report.txt")
    with open(report_path, "w") as f:
        f.write(report)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Print report
    print("\n" + "=" * 50)
    print(report)
    print("=" * 50)
    print(f"Test completed in {duration:.2f} seconds")
    print(f"Report saved to: {report_path}")
    
    # Return success status
    success_count = sum(1 for r in harness.results if r.success)
    total_count = len(harness.results)
    return success_count == total_count

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
