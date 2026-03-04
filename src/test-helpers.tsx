/**
 * Shared test helpers: mock factories, fixtures, and context setup
 * for component tests.
 */

import { vi } from 'vitest';
import type { KubeVipLease, KubeVipNode, KubeVipPod, KubeVipService } from './api/k8s';
import type { KubeVipContextValue } from './api/KubeVipDataContext';

// ---------------------------------------------------------------------------
// Default context value (everything empty / zeroed)
// ---------------------------------------------------------------------------

export function defaultContext(overrides?: Partial<KubeVipContextValue>): KubeVipContextValue {
  return {
    kubeVipInstalled: false,
    daemonSetStatus: null,
    kubeVipPods: [],
    cloudProviderPods: [],
    loadBalancerServices: [],
    nodes: [],
    leases: [],
    ipPools: [],
    configMapData: {},
    kubeVipConfig: {},
    loading: false,
    error: null,
    refresh: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Sample fixtures
// ---------------------------------------------------------------------------

export function makeSamplePod(overrides?: Partial<KubeVipPod>): KubeVipPod {
  return {
    metadata: {
      name: 'kube-vip-ds-abc12',
      namespace: 'kube-system',
      creationTimestamp: '2025-01-01T00:00:00Z',
      labels: { 'app.kubernetes.io/name': 'kube-vip-ds' },
    },
    spec: {
      nodeName: 'node-1',
      hostNetwork: true,
      containers: [
        {
          name: 'kube-vip',
          image: 'ghcr.io/kube-vip/kube-vip:v0.8.0',
          env: [
            { name: 'address', value: '192.168.1.100' },
            { name: 'vip_arp', value: 'true' },
            { name: 'cp_enable', value: 'true' },
            { name: 'svc_enable', value: 'true' },
            { name: 'vip_interface', value: 'eth0' },
            { name: 'vip_leaderelection', value: 'true' },
          ],
        },
      ],
    },
    status: {
      phase: 'Running',
      conditions: [{ type: 'Ready', status: 'True' }],
      containerStatuses: [
        {
          name: 'kube-vip',
          ready: true,
          restartCount: 0,
          image: 'ghcr.io/kube-vip/kube-vip:v0.8.0',
          state: { running: { startedAt: '2025-01-01T00:00:00Z' } },
        },
      ],
      hostIP: '10.0.0.1',
      podIP: '10.0.0.1',
    },
    ...overrides,
  };
}

export function makeSampleService(overrides?: Partial<KubeVipService>): KubeVipService {
  return {
    metadata: {
      name: 'my-service',
      namespace: 'default',
      creationTimestamp: '2025-01-01T00:00:00Z',
      annotations: {
        'kube-vip.io/loadbalancerIPs': '192.168.1.200',
        'kube-vip.io/vipHost': 'node-1',
      },
    },
    spec: {
      type: 'LoadBalancer',
      clusterIP: '10.96.0.100',
      externalTrafficPolicy: 'Cluster',
      ports: [{ name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' }],
    },
    status: {
      loadBalancer: {
        ingress: [{ ip: '192.168.1.200' }],
      },
    },
    ...overrides,
  };
}

export function makeSampleNode(overrides?: Partial<KubeVipNode>): KubeVipNode {
  return {
    metadata: {
      name: 'node-1',
      creationTimestamp: '2025-01-01T00:00:00Z',
      labels: {
        'node-role.kubernetes.io/control-plane': '',
        'kubernetes.io/hostname': 'node-1',
      },
    },
    spec: {
      podCIDR: '10.244.0.0/24',
    },
    status: {
      conditions: [{ type: 'Ready', status: 'True' }],
      addresses: [
        { type: 'InternalIP', address: '10.0.0.1' },
        { type: 'Hostname', address: 'node-1' },
      ],
      nodeInfo: {
        kubeletVersion: 'v1.30.0',
        osImage: 'Ubuntu 22.04',
        containerRuntimeVersion: 'containerd://1.7.0',
        architecture: 'amd64',
      },
    },
    ...overrides,
  };
}

export function makeSampleLease(overrides?: Partial<KubeVipLease>): KubeVipLease {
  return {
    metadata: {
      name: 'plndr-cp-lock',
      namespace: 'kube-system',
      creationTimestamp: '2025-01-01T00:00:00Z',
    },
    spec: {
      holderIdentity: 'node-1',
      leaseDurationSeconds: 15,
      renewTime: '2025-01-01T01:00:00Z',
      leaseTransitions: 3,
    },
    ...overrides,
  };
}

export function makeSampleDaemonSetStatus(): KubeVipContextValue['daemonSetStatus'] {
  return {
    desiredNumberScheduled: 3,
    currentNumberScheduled: 3,
    numberReady: 3,
    numberAvailable: 3,
    updatedNumberScheduled: 3,
    numberMisscheduled: 0,
  };
}
