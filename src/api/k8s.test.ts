import { describe, expect, it } from 'vitest';
import {
  extractPodConfig,
  filterLoadBalancerServices,
  formatAge,
  getNodeInternalIP,
  getNodeVipLabel,
  getPodImage,
  getPodRestarts,
  getServiceVIPs,
  getVipHost,
  isControlPlaneNode,
  isEgressEnabled,
  isKubeList,
  isKubeVipService,
  isLoadBalancerService,
  isNodeReady,
  isPodReady,
  isServiceIgnored,
  parseIPPools,
  phaseToStatus,
} from './k8s';

describe('isKubeList', () => {
  it('returns true for objects with items array', () => {
    expect(isKubeList({ items: [] })).toBe(true);
    expect(isKubeList({ items: [1, 2] })).toBe(true);
  });

  it('returns false for non-objects and missing items', () => {
    expect(isKubeList(null)).toBe(false);
    expect(isKubeList(undefined)).toBe(false);
    expect(isKubeList('string')).toBe(false);
    expect(isKubeList({ data: [] })).toBe(false);
  });
});

describe('isLoadBalancerService', () => {
  it('identifies LoadBalancer services', () => {
    expect(isLoadBalancerService({ spec: { type: 'LoadBalancer' }, metadata: { name: 'x' } })).toBe(
      true
    );
    expect(isLoadBalancerService({ spec: { type: 'ClusterIP' }, metadata: { name: 'x' } })).toBe(
      false
    );
    expect(isLoadBalancerService(null)).toBe(false);
  });
});

describe('isKubeVipService', () => {
  it('returns true when kube-vip annotations are present', () => {
    expect(
      isKubeVipService({
        metadata: { name: 'x', annotations: { 'kube-vip.io/loadbalancerIPs': '1.2.3.4' } },
        spec: { type: 'LoadBalancer' },
      })
    ).toBe(true);
  });

  it('returns false when no kube-vip annotations', () => {
    expect(
      isKubeVipService({
        metadata: { name: 'x' },
        spec: { type: 'LoadBalancer' },
      })
    ).toBe(false);
  });
});

describe('getServiceVIPs', () => {
  it('returns IPs from annotation', () => {
    const vips = getServiceVIPs({
      metadata: { name: 'x', annotations: { 'kube-vip.io/loadbalancerIPs': '1.2.3.4,5.6.7.8' } },
      spec: { type: 'LoadBalancer' },
    });
    expect(vips).toEqual(['1.2.3.4', '5.6.7.8']);
  });

  it('falls back to status.loadBalancer.ingress', () => {
    const vips = getServiceVIPs({
      metadata: { name: 'x' },
      spec: { type: 'LoadBalancer' },
      status: { loadBalancer: { ingress: [{ ip: '10.0.0.1' }] } },
    });
    expect(vips).toEqual(['10.0.0.1']);
  });

  it('falls back to spec.loadBalancerIP', () => {
    const vips = getServiceVIPs({
      metadata: { name: 'x' },
      spec: { type: 'LoadBalancer', loadBalancerIP: '10.0.0.2' },
    });
    expect(vips).toEqual(['10.0.0.2']);
  });

  it('returns empty array when no VIP info', () => {
    const vips = getServiceVIPs({
      metadata: { name: 'x' },
      spec: { type: 'LoadBalancer' },
    });
    expect(vips).toEqual([]);
  });
});

describe('getVipHost', () => {
  it('returns the vipHost annotation value', () => {
    expect(
      getVipHost({
        metadata: { name: 'x', annotations: { 'kube-vip.io/vipHost': 'node-1' } },
        spec: { type: 'LoadBalancer' },
      })
    ).toBe('node-1');
  });

  it('returns undefined when not present', () => {
    expect(
      getVipHost({
        metadata: { name: 'x' },
        spec: { type: 'LoadBalancer' },
      })
    ).toBeUndefined();
  });
});

describe('isEgressEnabled / isServiceIgnored', () => {
  it('detects egress enabled', () => {
    expect(
      isEgressEnabled({
        metadata: { name: 'x', annotations: { 'kube-vip.io/egress': 'true' } },
        spec: { type: 'LoadBalancer' },
      })
    ).toBe(true);
  });

  it('detects ignored service', () => {
    expect(
      isServiceIgnored({
        metadata: { name: 'x', annotations: { 'kube-vip.io/ignore': 'true' } },
        spec: { type: 'LoadBalancer' },
      })
    ).toBe(true);
  });
});

describe('filterLoadBalancerServices', () => {
  it('filters only LoadBalancer services', () => {
    const items = [
      { spec: { type: 'LoadBalancer' }, metadata: { name: 'a' } },
      { spec: { type: 'ClusterIP' }, metadata: { name: 'b' } },
      { spec: { type: 'LoadBalancer' }, metadata: { name: 'c' } },
    ];
    expect(filterLoadBalancerServices(items)).toHaveLength(2);
  });
});

describe('Node helpers', () => {
  const node = {
    metadata: {
      name: 'node-1',
      labels: { 'node-role.kubernetes.io/control-plane': '' },
    },
    status: {
      conditions: [{ type: 'Ready', status: 'True' }],
      addresses: [{ type: 'InternalIP', address: '10.0.0.1' }],
    },
  };

  it('isNodeReady returns true for Ready node', () => {
    expect(isNodeReady(node)).toBe(true);
  });

  it('isControlPlaneNode returns true for control-plane labeled node', () => {
    expect(isControlPlaneNode(node)).toBe(true);
  });

  it('getNodeInternalIP returns the InternalIP', () => {
    expect(getNodeInternalIP(node)).toBe('10.0.0.1');
  });

  it('getNodeVipLabel returns undefined when no VIP label', () => {
    expect(getNodeVipLabel(node)).toBeUndefined();
  });
});

describe('Pod helpers', () => {
  const pod = {
    metadata: { name: 'kube-vip-ds-abc' },
    spec: {
      containers: [
        {
          name: 'kube-vip',
          image: 'ghcr.io/kube-vip/kube-vip:v0.8.0',
          env: [
            { name: 'address', value: '192.168.1.100' },
            { name: 'vip_arp', value: 'true' },
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
          restartCount: 2,
          image: 'ghcr.io/kube-vip/kube-vip:v0.8.0',
        },
      ],
    },
  };

  it('isPodReady returns true for Ready pod', () => {
    expect(isPodReady(pod)).toBe(true);
  });

  it('getPodRestarts sums container restarts', () => {
    expect(getPodRestarts(pod)).toBe(2);
  });

  it('getPodImage returns container image', () => {
    expect(getPodImage(pod)).toBe('ghcr.io/kube-vip/kube-vip:v0.8.0');
  });

  it('extractPodConfig extracts env vars', () => {
    const config = extractPodConfig(pod);
    expect(config).toEqual({ address: '192.168.1.100', vip_arp: 'true' });
  });
});

describe('parseIPPools', () => {
  it('parses range and cidr pools', () => {
    const data = {
      'range-global': '192.168.1.200-192.168.1.250',
      'cidr-default': '10.0.0.0/24',
    };
    const pools = parseIPPools(data);
    expect(pools).toHaveLength(2);
    expect(pools[0]).toEqual({
      name: 'range-global',
      type: 'range',
      value: '192.168.1.200-192.168.1.250',
      scope: 'global',
    });
    expect(pools[1]).toEqual({
      name: 'cidr-default',
      type: 'cidr',
      value: '10.0.0.0/24',
      scope: 'global',
    });
  });

  it('parses namespace-scoped pools', () => {
    const data = {
      'staging/range-pool1': '10.1.0.100-10.1.0.200',
    };
    const pools = parseIPPools(data);
    expect(pools).toHaveLength(1);
    expect(pools[0].scope).toBe('namespace');
    expect(pools[0].namespace).toBe('staging');
  });

  it('returns empty for undefined data', () => {
    expect(parseIPPools(undefined)).toEqual([]);
  });
});

describe('formatAge', () => {
  it('returns "unknown" for undefined', () => {
    expect(formatAge(undefined)).toBe('unknown');
  });

  it('formats days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatAge(twoDaysAgo)).toBe('2d');
  });
});

describe('phaseToStatus', () => {
  it('maps Running to success', () => {
    expect(phaseToStatus('Running')).toBe('success');
  });

  it('maps Pending to warning', () => {
    expect(phaseToStatus('Pending')).toBe('warning');
  });

  it('maps unknown to error', () => {
    expect(phaseToStatus('Failed')).toBe('error');
  });
});
