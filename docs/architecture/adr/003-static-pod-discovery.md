# ADR 003: Static Pod Discovery with Label Selector Fallback

**Status**: Accepted

**Date**: 2026-03-05

**Deciders**: Development Team

---

## Context

kube-vip can be deployed in two ways:

1. **DaemonSet deployment**: Pods are managed by a DaemonSet and have standard labels (e.g., `app: kube-vip`) that can be used for label-selector based discovery.
2. **Static pod deployment**: Pod manifests are placed in `/etc/kubernetes/manifests/` on each node. Static pods do not have the same labels as DaemonSet-managed pods and follow the naming convention `kube-vip-<node-name>`.

The plugin needs to discover kube-vip pods regardless of the deployment method. The pod fetch uses a two-level fallback strategy: first try label-selector based discovery, then fall back to listing all pods in `kube-system` and filtering by name prefix.

---

## Decision

Implement a two-level pod discovery fallback:

1. **Primary**: Fetch pods using label selector (matches DaemonSet-deployed kube-vip).
2. **Fallback**: If the label-selector fetch fails or returns empty, list all pods in the `kube-system` namespace and filter by `name.startsWith('kube-vip')` (matches static pod naming convention).

This covers both deployment methods without requiring user configuration.

---

## Consequences

### Positive

- ✅ Works with both DaemonSet and static pod deployments out of the box
- ✅ No user configuration needed — deployment method is auto-detected
- ✅ Automatic fallback is transparent to the user and other plugin components

### Negative

- ⚠️ Fallback fetches all `kube-system` pods, which is a broader query than necessary
- ⚠️ Name-prefix matching (`kube-vip`) is convention-dependent and could produce false positives if other pods share the prefix

These negatives are mitigated by the fact that `kube-system` typically has a manageable number of pods, and the name prefix `kube-vip` is the standard convention used by the kube-vip project.

---

## Alternatives Considered

1. **Label selector only** — Rejected. Would miss static pod deployments entirely, leaving users who deploy kube-vip as static pods without visibility.

2. **Name prefix only** — Rejected. Less efficient than label selector for DaemonSet deployments, as it requires listing all pods in the namespace rather than using server-side filtering.

3. **User-configured discovery method** — Rejected. Adds unnecessary configuration burden for something that can be reliably auto-detected through the fallback strategy.

4. **Node filesystem check for static pod manifests** — Rejected. Requires node-level filesystem access, which is not available to Headlamp plugins running in the browser.

---

## Changelog

| Date | Change |
| ---- | ------ |
| 2026-03-05 | Initial decision recorded |
