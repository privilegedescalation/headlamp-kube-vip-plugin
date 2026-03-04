import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '@kinvolk/headlamp-plugin/lib/CommonComponents',
  async () => await import('./__mocks__/commonComponents')
);

vi.mock('../api/KubeVipDataContext');

import { useKubeVipContext } from '../api/KubeVipDataContext';
import { defaultContext, makeSampleService } from '../test-helpers';
import ServiceDetailSection from './ServiceDetailSection';

function mockContext(overrides?: Parameters<typeof defaultContext>[0]) {
  vi.mocked(useKubeVipContext).mockReturnValue(defaultContext(overrides));
}

describe('ServiceDetailSection', () => {
  it('returns null when loading', () => {
    mockContext({ loading: true });
    const { container } = render(
      <ServiceDetailSection
        resource={{
          metadata: { name: 'svc', namespace: 'default' },
          spec: { type: 'LoadBalancer' },
        }}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null for non-LoadBalancer services', () => {
    mockContext();
    const { container } = render(
      <ServiceDetailSection
        resource={{ metadata: { name: 'svc', namespace: 'default' }, spec: { type: 'ClusterIP' } }}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when service is not in filtered list', () => {
    mockContext({ loadBalancerServices: [] });
    const { container } = render(
      <ServiceDetailSection
        resource={{
          metadata: { name: 'unknown', namespace: 'default' },
          spec: { type: 'LoadBalancer' },
        }}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders kube-vip details for matching LoadBalancer service', () => {
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(
      <ServiceDetailSection
        resource={{
          metadata: { name: 'my-service', namespace: 'default' },
          spec: { type: 'LoadBalancer' },
        }}
      />
    );
    expect(screen.getByText('kube-vip Details')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.200')).toBeInTheDocument();
  });

  it('shows VIP host when available', () => {
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(
      <ServiceDetailSection
        resource={{
          metadata: { name: 'my-service', namespace: 'default' },
          spec: { type: 'LoadBalancer' },
        }}
      />
    );
    // "node-1" appears in both the VIP Host row and the vipHost annotation
    expect(screen.getAllByText('node-1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('VIP Host Node')).toBeInTheDocument();
  });

  it('shows egress label when enabled', () => {
    const svc = makeSampleService({
      metadata: {
        name: 'egress-svc',
        namespace: 'default',
        annotations: {
          'kube-vip.io/loadbalancerIPs': '10.0.0.1',
          'kube-vip.io/egress': 'true',
          'kube-vip.io/vipHost': 'node-1',
        },
      },
    });
    mockContext({ loadBalancerServices: [svc] });
    render(
      <ServiceDetailSection
        resource={{
          metadata: { name: 'egress-svc', namespace: 'default' },
          spec: { type: 'LoadBalancer' },
        }}
      />
    );
    expect(screen.getByText('Egress')).toBeInTheDocument();
  });

  it('shows ignored warning when service is ignored', () => {
    const svc = makeSampleService({
      metadata: {
        name: 'ignored-svc',
        namespace: 'default',
        annotations: {
          'kube-vip.io/ignore': 'true',
          'kube-vip.io/loadbalancerIPs': '10.0.0.1',
        },
      },
    });
    mockContext({ loadBalancerServices: [svc] });
    render(
      <ServiceDetailSection
        resource={{
          metadata: { name: 'ignored-svc', namespace: 'default' },
          spec: { type: 'LoadBalancer' },
        }}
      />
    );
    expect(screen.getByText(/ignoring this service/)).toBeInTheDocument();
  });
});
