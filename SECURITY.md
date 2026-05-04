# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Plugin Scope

This plugin is **read-only**. It does not perform any write operations against the Kubernetes cluster. It reads:

- Services (type: LoadBalancer)
- Nodes
- Pods in `kube-system`
- DaemonSets in `kube-system`
- Leases in `kube-system`
- ConfigMaps in `kube-system`

All data is fetched through Headlamp's built-in API proxy, which respects the user's existing RBAC permissions.

## Reporting a Vulnerability

Please report security vulnerabilities by opening a private issue or emailing the maintainers directly.
