# Changelog

## [0.1.3] - 2026-03-04

### Fixed

- Fix missing `useEffect` dependency array on Escape key listener in ServicesPage (re-registered every render)
- Wrap `closePanel` in `useCallback` to stabilize effect dependencies
- Fix invalid empty string `StatusLabel` status for non-kube-vip services (now uses `"info"`)
- Add ARIA `role="dialog"`, `aria-modal`, and `aria-label` to service detail slide-in panel
- Replace invalid `aria-label` on backdrop div with `role="presentation"`
- Use `phaseToStatus()` for pod status in NodesPage instead of hardcoded check (Failed pods now correctly show error)
- Remove unreachable `startsWith('kube-vip.io/has-ip=')` branch in `getNodeVipLabel` (label keys never contain `=`)
- Simplify redundant lease lookup conditions in OverviewPage
- Fix 46 ESLint indentation warnings across all source files

## [0.1.2] - 2025-05-20

### Fixed

- Add `--allow-same-version` flag for idempotent release retries
- Use `action-gh-release` instead of `gh` CLI for release creation

## [0.1.1] - 2025-05-20

### Fixed

- Remove redundant `mv` in release workflow
- Move Node.js setup before `npm version` in release workflow

## [0.1.0] - 2025-05-20

### Added

- Initial release
- Overview dashboard with deployment status, VIP mode, leader election
- LoadBalancer services page with VIP assignments and detail panel
- Nodes page with kube-vip pod status and leader designation
- Configuration page with DaemonSet config, IP pools, leases
- Service detail section injected into native Headlamp Service views
