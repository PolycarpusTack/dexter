# Alert Health Monitor - User Guide

## Introduction

The Alert Health Monitor helps you optimize your Sentry alerts by providing insights into their performance and effectiveness. This guide will walk you through using the system to reduce alert fatigue and improve your team's response to critical issues.

## Getting Started

### 1. Accessing Alert Health Monitor

To access the Alert Health Monitor:

1. Navigate to the Dexter dashboard
2. Click on "Alert Health" in the main navigation
3. You'll see an overview of all your Sentry alerts with their health scores

### 2. Understanding Health Scores

Each alert is assigned a health score from 0-100:

- **90-100 (Excellent)** 🟢: Alert is well-configured and effective
- **70-89 (Good)** 🟢: Alert is working well with minor optimization opportunities
- **50-69 (Fair)** 🟡: Alert needs attention and optimization
- **30-49 (Poor)** 🔴: Alert is problematic and requires immediate attention
- **0-29 (Critical)** 🔴: Alert is severely misconfigured or ineffective

### 3. Health Score Components

The health score is calculated based on:

- **False Positive Rate**: How often the alert triggers without requiring action
- **Response Time**: How quickly team members respond to the alert
- **Signal-to-Noise Ratio**: The ratio of actionable vs. non-actionable alerts
- **Volume**: The frequency of alert triggers
- **Resolution Rate**: How often alerts lead to actual issue resolution

## Main Dashboard

### Alert Health Overview

The main dashboard displays:

```
┌─────────────────────────────────────────────────────────────┐
│                 Alert Health Overview                       │
├─────────────────────────────────────────────────────────────┤
│  Total Alerts: 45  │  Avg Health: 72  │  Need Attention: 12 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Chart: Health Score Distribution]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Alert Name          │ Health │ Status │ Recommendations   │
│──────────────────────┼────────┼────────┼──────────────────│
│  API Error Rate      │   85   │   🟢   │        0         │
│  Memory Leak         │   45   │   🔴   │        3         │
│  Database Timeout    │   72   │   🟡   │        1         │
└─────────────────────────────────────────────────────────────┘
```

### Filtering and Sorting

You can filter alerts by:
- Health score range
- Alert type (error rate, performance, etc.)
- Team or project
- Time period
- Recommendation status

Sort options:
- Health score (ascending/descending)
- Alert volume
- Response time
- Last triggered

## Alert Details View

Click on any alert to see detailed health information:

### Health Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                    API Error Rate Alert                     │
├─────────────────────────────────────────────────────────────┤
│  Health Score: 85/100 🟢                                    │
├─────────────────────────────────────────────────────────────┤
│  Metrics:                                                   │
│  • False Positive Rate: 12%                                │
│  • Avg Response Time: 5 minutes                            │
│  • Signal-to-Noise: 0.88                                   │
│  • Triggers/Day: 3.5                                       │
│  • Resolution Rate: 78%                                    │
├─────────────────────────────────────────────────────────────┤
│  [Chart: Alert Trigger History - Last 30 Days]             │
└─────────────────────────────────────────────────────────────┘
```

### Pattern Analysis

View patterns in your alert behavior:

- **Time Distribution**: When alerts typically trigger
- **Burst Detection**: Periods of unusually high activity
- **Seasonality**: Weekly or monthly patterns
- **Trends**: Increasing or decreasing trigger frequency

### Historical Performance

Track how the alert's health has changed over time:

```
┌─────────────────────────────────────────────────────────────┐
│                 Health Score History                        │
├─────────────────────────────────────────────────────────────┤
│  [Line Chart: Health Score Over Last 90 Days]              │
│                                                             │
│  Key Events:                                               │
│  • Day 30: Threshold adjusted from 100 to 150              │
│  • Day 45: Alert conditions refined                        │
│  • Day 60: Team response process improved                  │
└─────────────────────────────────────────────────────────────┘
```

## Optimization Recommendations

### Types of Recommendations

The system provides several types of optimization recommendations:

1. **Threshold Adjustments**
   - Suggested new threshold values
   - Expected impact on false positives
   - Confidence level of recommendation

2. **Condition Refinements**
   - Additional filters to reduce noise
   - Time-based conditions
   - Exclusion rules

3. **Alert Consolidation**
   - Combine similar alerts
   - Group related alerts
   - Reduce alert fatigue

4. **Response Process**
   - Improve escalation procedures
   - Automate initial triage
   - Better alert routing

### Applying Recommendations

To apply a recommendation:

1. Review the recommendation details
2. Click "Preview Changes" to see the impact
3. Click "Apply Recommendation" to implement
4. Monitor the alert's health score for improvements

```
┌─────────────────────────────────────────────────────────────┐
│              Recommendation: Adjust Threshold               │
├─────────────────────────────────────────────────────────────┤
│  Current Threshold: 100 errors/minute                       │
│  Recommended: 150 errors/minute                             │
│                                                             │
│  Expected Impact:                                           │
│  • False Positives: -65%                                   │
│  • Alert Volume: -40%                                      │
│  • Missed Issues: <5%                                      │
│                                                             │
│  Confidence: 85%                                           │
│                                                             │
│  [Preview Changes]  [Apply Recommendation]                  │
└─────────────────────────────────────────────────────────────┘
```

## Real-Time Monitoring

### Live Health Updates

The Alert Health Monitor provides real-time updates via WebSocket connections:

- Health score changes
- New recommendations
- Alert trigger notifications
- Optimization results

### Alert Health Feed

```
┌─────────────────────────────────────────────────────────────┐
│                    Live Health Feed                         │
├─────────────────────────────────────────────────────────────┤
│  10:32 AM - Memory Leak Alert health improved to 72        │
│  10:28 AM - New recommendation for Database Timeout        │
│  10:15 AM - API Error Rate triggered (false positive)      │
│  10:10 AM - Optimization applied to User Login Failures    │
└─────────────────────────────────────────────────────────────┘
```

## Team Collaboration

### Sharing Insights

Share alert health information with your team:

1. **Export Reports**: Generate PDF or CSV reports
2. **Share Links**: Create shareable links to specific alerts
3. **Slack Integration**: Get notifications in Slack
4. **Comments**: Add notes and discuss optimizations

### Role-Based Access

Different team members have different permissions:

- **Viewers**: Can see health scores and recommendations
- **Analysts**: Can run analyses and generate reports
- **Operators**: Can apply recommendations
- **Administrators**: Full access to all features

## Best Practices

### 1. Regular Review Cycles

- Review alert health weekly
- Focus on lowest scoring alerts first
- Track improvement over time
- Document optimization decisions

### 2. Gradual Optimization

- Start with high-confidence recommendations
- Apply one change at a time
- Monitor impact for 24-48 hours
- Revert if negative impact observed

### 3. Team Alignment

- Discuss recommendations with on-call team
- Consider team bandwidth and preferences
- Balance noise reduction with coverage
- Document alert purpose and thresholds

### 4. Continuous Improvement

- Set health score targets
- Track team metrics (MTTI, MTTR)
- Celebrate improvements
- Learn from optimization failures

## Advanced Features

### Custom Health Metrics

Define organization-specific health metrics:

1. Navigate to Settings > Health Metrics
2. Click "Add Custom Metric"
3. Define calculation formula
4. Set weight in overall score

### Bulk Operations

Perform actions on multiple alerts:

1. Select alerts using checkboxes
2. Choose bulk action:
   - Apply similar recommendations
   - Export configurations
   - Update team assignments
   - Archive inactive alerts

### API Integration

Access alert health data programmatically:

```python
# Example: Get alert health via API
import requests

response = requests.get(
    "https://dexter-api.com/v1/alert-health/alerts/alert-123/health",
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

health_data = response.json()
print(f"Health Score: {health_data['score']}")
print(f"Recommendations: {len(health_data['recommendations'])}")
```

## Troubleshooting

### Common Issues

**1. No health score displayed**
- Ensure alert has sufficient history (24+ hours)
- Check Sentry API connectivity
- Verify alert permissions

**2. Recommendations not appearing**
- Alert needs minimum 100 triggers for analysis
- Check data quality and completeness
- Review recommendation confidence threshold

**3. Health score seems incorrect**
- Review metric calculations in details view
- Check for recent configuration changes
- Verify response time tracking is enabled

### Getting Help

- **Documentation**: Access in-app help guides
- **Support**: Contact support@dexter.io
- **Community**: Join our Slack channel
- **Feature Requests**: Submit via feedback form

## FAQs

**Q: How often are health scores updated?**
A: Health scores are recalculated every 5 minutes for active alerts and hourly for all alerts.

**Q: Can I customize the health score calculation?**
A: Yes, you can adjust metric weights and add custom metrics in Settings.

**Q: Will optimizations affect my existing alert rules?**
A: Optimizations create new versions of alerts. You can always revert to previous configurations.

**Q: How long does it take to see improvement after applying a recommendation?**
A: Initial impact is usually visible within 24 hours, with full results after 7 days.

**Q: Can I exclude certain alerts from health monitoring?**
A: Yes, you can exclude alerts in Settings > Alert Health > Exclusions.

## Quick Reference Card

### Keyboard Shortcuts

- `h`: Toggle help
- `f`: Focus search
- `r`: Refresh data
- `a`: View all alerts
- `o`: Open recommendations
- `s`: Open settings

### Health Score Quick Guide

| Score | Status | Action Required |
|-------|--------|-----------------|
| 90-100 | Excellent | Monitor only |
| 70-89 | Good | Minor tweaks |
| 50-69 | Fair | Optimization needed |
| 30-49 | Poor | Immediate attention |
| 0-29 | Critical | Urgent action |

### Key Metrics Reference

| Metric | Good | Poor | Impact |
|--------|------|------|--------|
| False Positive Rate | <20% | >50% | Alert fatigue |
| Response Time | <15min | >1hr | Issue resolution |
| Signal-to-Noise | >0.8 | <0.5 | Team efficiency |
| Resolution Rate | >70% | <40% | Alert effectiveness |