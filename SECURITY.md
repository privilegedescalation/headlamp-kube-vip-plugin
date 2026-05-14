# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Plugin Scope

This plugin is **read-only**. It does not perform any write operations against the Kubernetes cluster. It reads:

- Services (type: LoadBalancer)
- Nodes
- Pods in `headlamp`
- DaemonSets in `headlamp`
- Leases in `headlamp`
- ConfigMaps in `headlamp`

All data is fetched through Headlamp's built-in API proxy, which respects the user's existing RBAC permissions.

## Reporting a Vulnerability

Please report security vulnerabilities by opening a private issue or emailing the maintainers directly.

## Known Low-Severity Vulnerabilities

### GHSA-848j-6mx2-7j84 (elliptic)

**Severity:** High (but not exploitable in this plugin's context)

**Affected component:** `elliptic` (transitive, via `vite-plugin-node-polyfills` → `node-stdlib-browser` → `crypto-browserify` → `browserify-sign`)

**Description:** The elliptic library used in this plugin's development dependencies contains a prototype pollution vulnerability. This plugin is a **read-only** Headlamp plugin that never executes any cryptographic operations at runtime. The vulnerable code path requires:
- Use of `elliptic` curve operations on untrusted input, AND
- Ability for an attacker to influence the `elliptic` curve key generation input

Neither condition is met in this plugin's runtime context.

**Remediation:** No patched version of `elliptic` exists on npm. The current override in `package.json` (`"elliptic": ">=6.6.1"`) is a placeholder — no resolvable version satisfies this constraint.

**Risk acceptance rationale:**
1. Plugin has no write operations against the cluster
2. All data flows through Headlamp's API proxy with standard RBAC enforcement
3. The vulnerable dependency is only in the development/build toolchain, not runtime
4. No untrusted input can reach `elliptic` curve operations through this plugin

**Review date:** 2026-05-05
**Reviewed by:** Hugh Hackman (VP Engineering Operations)
