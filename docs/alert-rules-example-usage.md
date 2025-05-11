# Alert Rules Example Usage

## Prerequisites

1. Ensure your Sentry organization and project are configured in Dexter
2. Navigate to Alert Rules from the main navigation menu

## Creating an Issue Alert Rule

### Example: Alert on Database Deadlocks

1. Click "Create Alert Rule"
2. Select "Issue Alert" tab
3. Fill in the form:

```
Name: Database Deadlock Alert
Environment: production

Conditions:
- Select: "The issue is seen more than X times in Y minutes"
- Value: 5
- Interval: 15 minutes

Filters (optional):
- Select: "The issue is older/newer than X days"
- Comparison: Newer than
- Value: 1
- Time unit: Days

Actions:
- Select: "Send a Slack notification"
- Workspace ID: 123456789
- Channel: #backend-alerts

Frequency: 30 minutes
```

4. Click "Create Rule"

## Creating a Metric Alert Rule

### Example: High Error Rate Alert

1. Click "Create Alert Rule"
2. Select "Metric Alert" tab
3. Fill in the form:

```
Name: High Error Rate Alert
Environment: production

Metric: Number of errors
Time Window: 5 minutes
Query: transaction:/api/* AND !transaction:/api/health

Threshold Type: Above

Triggers:
- Critical:
  - Alert Threshold: 100
  - Actions: 
    - Send an email notification
    - Target: Team
    - Identifier: backend-team

- Warning:
  - Alert Threshold: 50
  - Actions:
    - Send a Slack notification
    - Channel: #monitoring

Resolve Threshold: 25
```

4. Click "Create Rule"

## Common Use Cases

### 1. New Error Detection
```
Type: Issue Alert
Condition: A new issue is created
Action: Send email to issue owners
```

### 2. Performance Degradation
```
Type: Metric Alert
Metric: Transaction duration (p95)
Threshold: Above 500ms
Time Window: 10 minutes
```

### 3. User Impact Alert
```
Type: Metric Alert
Metric: Users experiencing errors
Threshold: Above 50 users
Time Window: 5 minutes
```

### 4. Deployment Regression
```
Type: Issue Alert
Condition: The issue changes state from resolved to unresolved
Filter: The event is from the latest release
Action: Create a Jira ticket
```

## Managing Alert Rules

### Editing a Rule
1. Find the rule in the list
2. Click the edit icon
3. Modify the configuration
4. Click "Update Rule"

### Deleting a Rule
1. Find the rule in the list
2. Click the delete icon
3. Confirm deletion

### Filtering Rules
- Use the search functionality to find specific rules
- Filter by type (Issue/Metric)
- Sort by creation date or name

## Best Practices

1. **Start Conservative**: Begin with higher thresholds and adjust based on actual alert frequency
2. **Use Environments**: Target specific environments to reduce noise
3. **Combine Conditions**: Use multiple conditions for more precise alerting
4. **Test Incrementally**: Start with one action, then add more as needed
5. **Monitor Alert Fatigue**: Regularly review alert frequency and adjust thresholds
6. **Document Rules**: Use descriptive names that explain the rule's purpose

## Troubleshooting

### Rule Not Triggering
- Check threshold values
- Verify environment matches
- Ensure query syntax is correct
- Confirm integration settings (Slack workspace, channel IDs)

### Too Many Alerts
- Increase threshold values
- Add more specific filters
- Increase time windows
- Use query filters to be more specific

### Integration Issues
- Verify Slack/Jira/etc. integrations are properly configured in Sentry
- Check integration IDs match
- Ensure proper permissions for creating tickets/sending messages
