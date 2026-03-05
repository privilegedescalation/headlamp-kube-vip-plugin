# ADR 001: React Context for Centralized State

**Status**: Accepted

**Date**: 2026-03-05

**Deciders**: Development Team

---

## Context

The kube-vip plugin shares data across 4 page views (Overview, Services, Nodes, Config) and 1 detail view section (Service). Data comes from standard Kubernetes resources:

- **Services** (via `useList()`)
- **Nodes** (via `useList()`)
- **DaemonSet** (via `ApiProxy.request()`)
- **Pods** (with fallback, via `ApiProxy.request()`)
- **Leases** (`coordination.k8s.io/v1`, via `ApiProxy.request()`)
- **ConfigMap** (via `ApiProxy.request()`)

The context exposes 12 fields: `kubeVipInstalled`, `daemonSetStatus`, `kubeVipPods`, `cloudProviderPods`, `loadBalancerServices`, `nodes`, `leases`, `ipPools`, `configMapData`, `kubeVipConfig`, `loading`, `error`, and `refresh`.

The plugin uses dual-track fetching: Headlamp `useList()` for Services and Nodes, `ApiProxy.request()` for everything else.

---

## Decision

Use a single `KubeVipDataProvider` React Context wrapping all routes and the Service detail section registration. All kube-vip state is computed in the provider and made available to consumers via the `useKubeVipData()` hook.

---

## Consequences

### Positive

- ✅ Single fetch location eliminates duplicate API calls across views
- ✅ Consistent data across all views at any point in time
- ✅ Derived state (e.g., `ipPools` from ConfigMap) computed once in the provider
- ✅ `refresh()` function updates everything in a single call

### Negative

- ⚠️ All consumers re-render on any change to any of the 12 fields
- ⚠️ Complex provider component managing 12 fields and multiple fetch strategies

These negatives are mitigated by the fact that kube-vip state changes infrequently (VIP assignments and pool configurations are relatively stable), so unnecessary re-renders are rare in practice.

---

## Alternatives Considered

1. **Per-page fetching** — Rejected. Would duplicate DaemonSet, ConfigMap, and Lease fetching across multiple pages, leading to redundant API calls and potential data inconsistency between views.

2. **Multiple contexts** (e.g., separate contexts for pods, services, config) — Rejected. Data is heavily cross-referenced: `kubeVipInstalled` depends on the DaemonSet, pod discovery depends on labels from the DaemonSet, and IP pool utilization requires both ConfigMap data and Service annotations. Splitting contexts would require complex inter-context dependencies.

3. **External state library** (e.g., Redux, Zustand) — Rejected. External state management libraries are not available in the Headlamp plugin runtime environment.

---

## Changelog

| Date | Change |
| ---- | ------ |
| 2026-03-05 | Initial decision recorded |
