"""
Examples demonstrating how to use the Alert Health Monitor system.

This file contains practical examples of using the Alert Health Monitor
API endpoints and services.
"""

import asyncio
from datetime import datetime
from typing import Dict, List

import httpx

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
SENTRY_API_KEY = "your-sentry-api-key"


async def example_get_health_metrics():
    """Example: Get health metrics for specific alert rules."""
    async with httpx.AsyncClient() as client:
        # Request health metrics for specific alert rules
        response = await client.post(
            f"{API_BASE_URL}/alert-health/metrics",
            json={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-01-31T23:59:59Z",
                "rule_ids": ["rule_123", "rule_456"],
                "include_patterns": True
            },
            headers={"X-Sentry-Auth": SENTRY_API_KEY}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Alert Health Metrics:")
            for metric in data["metrics"]:
                print(f"Rule: {metric['rule_name']}")
                print(f"  Total Triggers: {metric['total_triggered_count']}")
                print(f"  False Positive Rate: {metric['false_positive_rate']:.2%}")
                print(f"  Noise Level: {metric['noise_level']}")
                print()


async def example_detect_storms():
    """Example: Detect alert storms in a time period."""
    async with httpx.AsyncClient() as client:
        # Detect alert storms
        response = await client.post(
            f"{API_BASE_URL}/alert-health/storms",
            json={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-01-31T23:59:59Z",
                "min_alerts_threshold": 50
            },
            headers={"X-Sentry-Auth": SENTRY_API_KEY}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Alert Storms Detected:")
            for storm in data["storms"]:
                print(f"Storm ID: {storm['storm_id']}")
                print(f"  Duration: {storm['duration_minutes']} minutes")
                print(f"  Total Alerts: {storm['total_alerts']}")
                print(f"  Severity: {storm['severity']}")
                print(f"  Root Cause: {storm['characteristics']['root_cause_score']:.2f}")
                print()


async def example_get_threshold_recommendations():
    """Example: Get threshold recommendations for noisy alert rules."""
    async with httpx.AsyncClient() as client:
        # Get threshold recommendations
        response = await client.post(
            f"{API_BASE_URL}/alert-health/recommendations",
            json={
                "rule_ids": ["rule_123", "rule_456"],
                "optimization_goal": "balanced",  # Options: noise_reduction, sensitivity, balanced
                "min_confidence": 0.7
            },
            headers={"X-Sentry-Auth": SENTRY_API_KEY}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Threshold Recommendations:")
            for rec in data["recommendations"]:
                print(f"Rule: {rec['rule_id']}")
                print(f"  Confidence: {rec['confidence_score']:.2f}")
                print(f"  Current Threshold: {rec['current_threshold']}")
                print(f"  Recommended Threshold: {rec['recommended_threshold']}")
                print(f"  Expected Noise Reduction: {rec['expected_impact']['noise_reduction']:.2%}")
                print()


async def example_get_dashboard_data():
    """Example: Get comprehensive dashboard data."""
    async with httpx.AsyncClient() as client:
        # Get dashboard data
        response = await client.get(
            f"{API_BASE_URL}/alert-health/dashboard",
            params={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-01-31T23:59:59Z"
            },
            headers={"X-Sentry-Auth": SENTRY_API_KEY}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Alert Health Dashboard:")
            
            # Overall health score
            print(f"Overall Health Score: {data['overall_health_score']:.2f}")
            
            # Noisy rules
            print("\nNoisiest Rules:")
            for rule in data["noisy_rules"][:5]:
                print(f"  - {rule['rule_name']}: {rule['noise_score']:.2f}")
            
            # Recent storms
            print("\nRecent Alert Storms:")
            for storm in data["recent_storms"][:3]:
                print(f"  - {storm['start_time']}: {storm['total_alerts']} alerts")
            
            # Optimization opportunities
            print("\nOptimization Opportunities:")
            for opp in data["optimization_opportunities"][:5]:
                print(f"  - {opp['rule_name']}: {opp['potential_noise_reduction']:.2%} reduction")


async def example_scheduled_task_management():
    """Example: Manage scheduled analysis tasks."""
    async with httpx.AsyncClient() as client:
        # List scheduled tasks
        response = await client.get(
            f"{API_BASE_URL}/alert-health/scheduled-tasks",
            headers={"X-Sentry-Auth": SENTRY_API_KEY}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Scheduled Tasks:")
            for task in data["tasks"]:
                print(f"  - {task['name']}: {task['schedule_type']} ({'enabled' if task['enabled'] else 'disabled'})")
        
        # Enable a specific task
        await client.put(
            f"{API_BASE_URL}/alert-health/scheduled-tasks/daily_health_analysis",
            headers={"X-Sentry-Auth": SENTRY_API_KEY}
        )
        print("\nEnabled daily health analysis task")
        
        # Execute a task immediately
        await client.post(
            f"{API_BASE_URL}/alert-health/scheduled-tasks/daily_health_analysis/execute",
            headers={"X-Sentry-Auth": SENTRY_API_KEY}
        )
        print("Triggered immediate execution of daily health analysis")


# Main execution
async def main():
    """Run all examples."""
    print("Alert Health Monitor Examples\n")
    
    print("1. Getting Health Metrics")
    print("-" * 30)
    await example_get_health_metrics()
    
    print("\n2. Detecting Alert Storms")
    print("-" * 30)
    await example_detect_storms()
    
    print("\n3. Getting Threshold Recommendations")
    print("-" * 30)
    await example_get_threshold_recommendations()
    
    print("\n4. Getting Dashboard Data")
    print("-" * 30)
    await example_get_dashboard_data()
    
    print("\n5. Managing Scheduled Tasks")
    print("-" * 30)
    await example_scheduled_task_management()


if __name__ == "__main__":
    asyncio.run(main())