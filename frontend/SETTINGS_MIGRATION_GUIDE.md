# Settings Migration Guide

## Configuration Location Change

As of the latest update, the Sentry configuration settings have been moved from the navigation sidebar to a dedicated Configuration page for better organization and user experience.

### Where to Find Settings Now

1. **Navigate to Configuration Page**
   - Click the "Configuration" link at the bottom of the navigation sidebar
   - Or directly navigate to `/config` in your browser

2. **All Settings in One Place**
   - Sentry connection settings (Organization Slug, Project Slug)
   - API token configuration
   - AI model settings
   - Connection status monitoring

### Why This Change?

- **Reduced Confusion**: Settings were previously available in multiple locations
- **Better Organization**: All configuration options are now centralized
- **Improved UX**: Dedicated configuration page provides more space and better layout
- **Clearer Navigation**: Settings are no longer cluttering the main navigation area

### For Developers

If you were programmatically opening the settings via `window.openSentrySettings()`, you should now:
- Navigate users to the `/config` route instead
- Use the router's navigation methods to direct users to the configuration page

### Migration Checklist

- [ ] Update any documentation that references settings in the navbar
- [ ] Update any automated tests that interact with navbar settings
- [ ] Inform users about the new location through release notes
- [ ] Update any bookmarks or shortcuts to the old settings location