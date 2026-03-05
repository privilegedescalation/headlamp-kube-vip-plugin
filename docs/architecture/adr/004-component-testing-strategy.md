# ADR 004: Comprehensive Component-Level Testing with Shared Helpers

**Status**: Accepted

**Date**: 2026-03-05

**Deciders**: Development Team

---

## Context

The plugin has extensive test coverage including both unit tests (`k8s.ts`, `KubeVipDataContext`) and component render tests (`ConfigPage`, `NodesPage`, `OverviewPage`, `ServiceDetailSection`, `ServicesPage`). Component tests need to mock both Headlamp's API and CommonComponents.

A shared `test-helpers.tsx` file provides fixture factories, and a `__mocks__/commonComponents.ts` file provides stub implementations of Headlamp's CommonComponents for render testing.

---

## Decision

Implement comprehensive component-level testing with two shared test infrastructure files:

1. **`test-helpers.tsx`**: Shared fixture factories for creating test data (mock Services, Nodes, Pods, DaemonSets, ConfigMaps, Leases). Provides consistent test data across all test files.
2. **`__mocks__/commonComponents.ts`**: Stub implementations of Headlamp CommonComponents (`SectionBox`, `SimpleTable`, `StatusLabel`, `NameValueTable`) that render as simple HTML elements for testing.

All component tests render with a `KubeVipDataProvider` wrapper using mocked context values, verifying the component renders correct data from context.

---

## Consequences

### Positive

- ✅ Consistent test fixtures across all test files eliminate divergent test data
- ✅ CommonComponents mocks enable render testing without the full Headlamp runtime
- ✅ Comprehensive coverage of component rendering logic and context integration
- ✅ Easy to add new component tests by reusing existing fixtures and mocks

### Negative

- ⚠️ Mock maintenance burden when Headlamp's CommonComponents API changes
- ⚠️ Test helpers may diverge from actual API shapes over time if not kept in sync

These negatives are mitigated by type-checking test helpers against the actual interfaces, ensuring compile-time detection of API shape mismatches.

---

## Alternatives Considered

1. **Unit tests only** (no component rendering) — Rejected. Misses rendering bugs and context integration issues that only surface when components are mounted with real context values.

2. **E2E tests only** — Rejected. Too slow for rapid development feedback and requires a running Headlamp instance with a connected cluster.

3. **Inline mocks per test file** — Rejected. Leads to inconsistent and duplicated test setup across files, making it harder to maintain and update when APIs change.

4. **Storybook for component testing** — Rejected. Additional tooling overhead is not justified for the scope of this plugin, and Storybook does not easily integrate with Headlamp's plugin component model.

---

## Changelog

| Date | Change |
| ---- | ------ |
| 2026-03-05 | Initial decision recorded |
