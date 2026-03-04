# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Headlamp plugin for kube-vip virtual IP and load balancer visibility. Read-only — monitors kube-vip DaemonSet/pods, LoadBalancer services, nodes, IP pools, and leader election. No cluster write operations.

- **Plugin name**: `kube-vip`
- **Target**: Headlamp >= v0.26
- **Data sources**: kube-vip DaemonSet/pods in `kube-system`, Services (type:LoadBalancer), Nodes, Leases, `kubevip` ConfigMap
- **Reference plugin**: `../headlamp-polaris-plugin`

## Commands

```bash
npm start          # dev server with hot reload
npm run build      # production build
npm run package    # package for headlamp
npm run tsc        # TypeScript type check (no emit)
npm run lint       # ESLint
npm run lint:fix   # ESLint with auto-fix
npm run format     # Prettier write
npm run format:check # Prettier check
npm test           # vitest run
npm run test:watch # vitest watch mode
```

All tests and `tsc` must pass before committing.

## Architecture

```
src/
├── index.tsx                         # Plugin entry: registerRoute, registerSidebarEntry, registerDetailsViewSection
├── test-helpers.tsx                  # Shared test utilities and fixtures
├── api/
│   ├── k8s.ts                        # Types + helpers (Services, Nodes, Pods, DaemonSets, Leases, ConfigMaps)
│   └── KubeVipDataContext.tsx        # Shared React context provider
└── components/
    ├── OverviewPage.tsx               # Dashboard: deployment status, cluster summary, VIP overview
    ├── ServicesPage.tsx               # LoadBalancer services with VIP assignments and detail panel
    ├── NodesPage.tsx                  # Nodes with kube-vip pod status and leader election
    ├── ConfigPage.tsx                 # DaemonSet config, IP pools, leases, pod details
    ├── ServiceDetailSection.tsx       # Injected into Headlamp Service detail view
    └── __mocks__/
        └── commonComponents.ts       # Test mocks for headlamp CommonComponents
```

## Data flow

`KubeVipDataContext.tsx` uses **two fetching strategies**:

1. **Headlamp hooks** (`K8s.ResourceClasses.*.useList()`) — for Services and Nodes.
2. **`ApiProxy.request()`** — for kube-vip DaemonSet, pods (with label selector fallback for static pods), cloud-provider pods, Leases, and the `kubevip` ConfigMap.

kube-vip uses **no CRDs**. All state comes from standard Kubernetes resources and `kube-vip.io/*` annotations on Services.

## Key constants (src/api/k8s.ts)

- Namespace: `kube-system`
- DaemonSet name: `kube-vip-ds`
- Cloud provider name: `kube-vip-cloud-provider`
- ConfigMap name: `kubevip`
- Annotation prefix: `kube-vip.io/`
- Pod selector: `app.kubernetes.io/name=kube-vip-ds`
- Cloud provider selector: `app=kube-vip-cloud-provider`
- Metrics port: `2112`

## Code conventions

- Functional React components only — no class components
- All imports from `@kinvolk/headlamp-plugin/lib` and `@kinvolk/headlamp-plugin/lib/CommonComponents`
- No additional UI libraries (no MUI direct imports, no Ant Design, etc.)
- TypeScript strict mode — no `any`, use `unknown` + type guards at API boundaries
- Context provider (`KubeVipDataProvider`) wraps each route component in `index.tsx`
- Tests: vitest + @testing-library/react, mock with `vi.mock('@kinvolk/headlamp-plugin/lib', ...)`
- `vitest.setup.ts` provides a spec-compliant `localStorage` shim for Node 22+ compatibility

## Testing

Mock pattern for headlamp APIs:
```typescript
vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  ApiProxy: { request: vi.fn().mockResolvedValue({ items: [] }) },
  K8s: {
    ResourceClasses: {
      Service: { useList: vi.fn(() => [[], null]) },
      Node: { useList: vi.fn(() => [[], null]) },
    },
  },
}));
```
