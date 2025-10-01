# Technical Debt Report

## 1. Executive Summary

This report details the current state of technical debt in the Dexter codebase. While the project is generally well-structured, there are several areas of technical debt that should be addressed to improve maintainability, stability, and performance. The most critical issues are related to outdated and misconfigured frontend dependencies, performance bottlenecks in the backend, and a lack of proper error handling in the frontend API client.

## 2. Dependency-related Debt

*   **Outdated Major Versions:**
    *   `@tanstack/react-query` is on version 4, while version 5 is the latest stable release. An upgrade should be considered to leverage the latest features and performance improvements.
    *   **Finding:** Version `4.29.19` was published approximately two years ago, indicating it is outdated and not actively maintained for new features or critical bug fixes.
*   **Dependency Conflicts and Overrides:**
    *   The `resolutions` and `overrides` fields in `package.json` are being used to force specific versions of `@mantine/core`, `react`, and `react-dom`. This strongly suggests that there are dependency conflicts within the project that are being patched rather than resolved at the root. This can lead to an unstable build and make future upgrades more difficult.
*   **Pre-release Software:**
    *   The project is using a pre-release version of `react-router-dom` (`v7.6.0`). Using pre-release software in a production environment is risky and should be avoided.
    *   **Finding:** Version `7.6.0` is a pre-release version, not a stable release, and is not the focus of active development compared to the stable v6.

## 3. Architectural and Structural Debt

*   **Redundant Backend Files:**
    *   The backend contains deprecated `main` files (`main_minimal.py`, `main_simplified.py`) that should be removed.
*   **Code Duplication:**
    *   The presence of `enhanced_` prefixed files alongside their regular counterparts (e.g., `enhanced_issues.py` and `issues.py`) suggests a pattern of extending functionality by duplicating and modifying existing code, rather than through proper abstraction and extension. This leads to code duplication and maintenance overhead.
*   **Anti-Pattern Violations:**
    *   **God Object:** The `SentryApiClient` class in `backend/app/services/sentry_client.py` contains 32 methods, significantly exceeding the recommended `class_methods: 10` threshold. This class is responsible for too many functionalities, leading to high coupling and low cohesion.
    *   **Callback Hell / Promise Chains:** No significant instances of deeply nested callbacks or `.then()` chains were found in the frontend, indicating good use of `async/await`.
    *   **Tight Coupling:**
        *   The `SentryApiClient` directly instantiates `httpx.AsyncClient` internally, rather than receiving it as an injected dependency. While the client is passed to `_request`, the initial creation within the class creates a tighter coupling than necessary.
        *   The `AnalyzerOrchestrator` class in `backend/app/services/analyzer_orchestrator.py` is tightly coupled to the global `analyzer_registry` instance. This makes testing and swapping out different registry implementations more difficult.

## 4. Implementation Debt

*   **Incomplete Features:**
    *   The `DeadlockDisplay` visualization is not fully implemented.
    *   The "Performance Metrics Dashboard" is not fully implemented.
*   **Performance Bottlenecks:**
    *   The backend fetches all Sentry issues at once without pagination, which will cause performance issues as the number of issues grows.
*   **Temporary Workarounds:**
    *   The frontend uses a temporary solution for handling bulk actions in the `issuesSlice`.
*   **Missing Error Handling:**
    *   The frontend API client lacks proper error handling and response transformation, which can lead to a poor user experience and make debugging difficult.
*   **Code Quality Standards Violations:**
    *   **`EventTable.tsx`:**
        *   **Function Length:** The main `EventTable` component function is approximately 100 lines long, exceeding the recommended `function_length: 50` threshold.
        *   **Cyclomatic Complexity:** The component's logic, including multiple conditional rendering paths and complex state management, suggests a cyclomatic complexity likely above the `cyclomatic_complexity: 10` threshold.

## 5. Testing Debt

*   **Missing Tests:**
    *   Some components, like `DeadlockDisplay` and `EventTable`, lack dedicated test files. A comprehensive testing strategy should be implemented to ensure that all critical components are covered.

## 6. Recommendations

1.  **Address Frontend Dependency Issues (High Priority):**
    *   Investigate the root cause of the dependency conflicts and remove the `resolutions` and `overrides` from `package.json`.
    *   Upgrade `@tanstack/react-query` to the latest major version (v5).
    *   Switch to a stable version of `react-router-dom`.
2.  **Fix Backend Performance Bottleneck (High Priority):**
    *   Implement pagination in the backend when fetching issues from Sentry.
3.  **Improve Frontend API Client (High Priority):
    *   Implement proper error handling and response transformation in the frontend API client.
4.  **Refactor `enhanced_` files (Medium Priority):**
    *   Refactor the `enhanced_` prefixed files to avoid code duplication. Use proper software design patterns like inheritance or composition to extend functionality.
5.  **Complete Incomplete Features (Medium Priority):**
    *   Implement the D3.js visualization for the `DeadlockDisplay` component.
    *   Complete the "Performance Metrics Dashboard".
6.  **Clean Up Backend Code (Low Priority):**
    *   Remove the deprecated `main_minimal.py` and `main_simplified.py` files.
7.  **Improve Test Coverage (Ongoing):**
    *   Add tests for components that currently lack them and ensure that new features are accompanied by tests.
8.  **Refactor Large Components and God Objects (Ongoing):**
    *   Break down large and complex components like `EventTable.tsx` into smaller, more manageable, and testable units.
    *   Refactor the `SentryApiClient` into smaller, more focused services, adhering to the Single Responsibility Principle.
    *   Refactor `AnalyzerOrchestrator` to reduce its tight coupling with the global `analyzer_registry` instance, possibly by injecting the registry as a dependency.
