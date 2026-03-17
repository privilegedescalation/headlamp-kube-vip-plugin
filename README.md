# headlamp-kube-vip-plugin

[![CI](https://github.com/privilegedescalation/headlamp-kube-vip-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/privilegedescalation/headlamp-kube-vip-plugin/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A [Headlamp](https://headlamp.dev/) plugin providing visibility into [kube-vip](https://kube-vip.io/) virtual IP and load balancer deployments.

## Features

- **Overview Dashboard** — Deployment status, VIP mode (ARP/BGP), leader election, cluster summary
- **Services** — LoadBalancer services with VIP assignments, kube-vip annotations, egress status
- **Nodes** — Cluster nodes with kube-vip pod status, leader designation, VIP labels
- **Configuration** — DaemonSet config, IP address pools, leader election leases
- **Service Detail Integration** — kube-vip details injected into native Headlamp Service detail views

## Installation

Search for `kube-vip` in the Headlamp Plugin Manager (Settings → Plugins → Catalog).

## Requirements

- Headlamp >= v0.26
- kube-vip deployed in `kube-system` (DaemonSet or static pod)
- Optional: kube-vip-cloud-provider for IP pool management

## RBAC

This plugin is **read-only** and requires the following permissions:

| Resource | API Group | Verbs |
|----------|-----------|-------|
| services | v1 | list, get, watch |
| nodes | v1 | list, get, watch |
| pods | v1 | list, get, watch |
| daemonsets | apps/v1 | get |
| leases | coordination.k8s.io | list, get, watch |
| configmaps | v1 | get |

## Architecture

```
src/
├── index.tsx                    # Plugin entry point
├── api/
│   ├── k8s.ts                   # Types and helper functions
│   └── KubeVipDataContext.tsx   # React context provider
└── components/
    ├── OverviewPage.tsx          # Dashboard
    ├── ServicesPage.tsx          # LoadBalancer services
    ├── NodesPage.tsx             # Cluster nodes
    ├── ConfigPage.tsx            # Configuration & IP pools
    └── ServiceDetailSection.tsx  # Injected into Service detail view
```

## Development

```bash
npm install
npm start          # dev server
npm test           # run tests
npm run tsc        # type check
npm run lint       # ESLint
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "kube-vip Not Detected" | No kube-vip pods in kube-system | Install kube-vip per https://kube-vip.io/docs/installation/ |
| No IP pools shown | kubevip ConfigMap not found | Install kube-vip-cloud-provider |
| Services show "Pending" VIP | No IP pool configured or pool exhausted | Add IP ranges to kubevip ConfigMap |
| Leader shows "—" | No kube-vip leases found | Verify leader election is enabled (`vip_leaderelection=true`) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.
