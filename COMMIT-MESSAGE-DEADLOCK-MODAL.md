feat(deadlock): Implement modal-based Deadlock Analyzer

This commit enhances the PostgreSQL Deadlock Analyzer by moving it into a 
dedicated modal interface, providing more space for visualizations and a 
focused analysis experience.

Key changes:
- Create DeadlockModal component with full-screen capability
- Implement DeadlockColumn for EventTable integration
- Add custom hooks for clipboard, data masking, and audit logging
- Implement component-level error boundaries for stability
- Add sensitize data masking for security
- Enhance EventsPage to showcase the modal integration
- Add mock data utilities for testing

This implementation addresses feedback from the consolidated action plan,
focusing on TypeScript patterns, error handling, data masking, and performance
optimizations while providing a more usable interface for deadlock analysis.

Related: #123
Closes: #456
