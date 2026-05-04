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
