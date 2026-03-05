# ADR 002: Annotation-Based State Without CRDs

**Status**: Accepted

**Date**: 2026-03-05

**Deciders**: Development Team

---

## Context

kube-vip does not define any Custom Resource Definitions. All kube-vip state is inferred from standard Kubernetes resources:

- **DaemonSet status** indicates whether kube-vip is installed
- **`kube-vip.io/*` annotations on Services** indicate VIP configuration (requested IP, interface, load balancer class)
- **Lease holder identity** indicates leader election status
- **ConfigMap data** contains IP pool configuration

The plugin must extract kube-vip-specific state from these standard resources without relying on any custom APIs or CRDs.

---

## Decision

Parse kube-vip state entirely from annotations on standard Kubernetes resources and ConfigMap data. No CRDs are queried. Annotation parsing functions in `k8s.ts` extract VIP configuration from Service annotations (e.g., `kube-vip.io/vipAddress`, `kube-vip.io/loadbalancerIPs`). IP pool configuration is parsed from the `kubevip` ConfigMap via `parseIPPools()`. Leader election status is read from Lease `.spec.holderIdentity`.

---

## Consequences

### Positive

- ✅ No CRD dependency — works with any kube-vip installation regardless of version or configuration
- ✅ Uses only standard Kubernetes resources accessible via the standard API
- ✅ Annotation parsing is implemented as pure functions, making it straightforward to test
- ✅ Works across all kube-vip versions that follow the annotation conventions

### Negative

- ⚠️ Annotation schema is implicit — there is no API validation or schema enforcement for annotation values
- ⚠️ Annotations may change across kube-vip versions without notice, since they are not part of a formal API contract
- ⚠️ Parsing logic must handle missing or malformed annotations gracefully

These negatives are mitigated by defensive parsing with fallbacks for missing annotations and sensible defaults when annotation values are absent or unparseable.

---

## Alternatives Considered

1. **kube-vip CRDs** (if they existed) — Not available. kube-vip does not define any Custom Resource Definitions, so there are no custom resources to query.

2. **kube-vip API server** (if it existed) — Not available. kube-vip does not expose a dedicated API server or endpoint for querying its state.

3. **Parse kube-vip pod logs** — Rejected. Log parsing is inherently fragile, depends on log format stability, and requires log access RBAC permissions that may not be available in all environments.

---

## Changelog

| Date | Change |
| ---- | ------ |
| 2026-03-05 | Initial decision recorded |
