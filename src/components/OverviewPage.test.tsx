import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '@kinvolk/headlamp-plugin/lib/CommonComponents',
  async () => await import('./__mocks__/commonComponents')
);

vi.mock('../api/KubeVipDataContext');

import { useKubeVipContext } from '../api/KubeVipDataContext';
import {
  defaultContext,
  makeSampleLease,
  makeSampleNode,
  makeSamplePod,
  makeSampleService,
} from '../test-helpers';
import OverviewPage from './OverviewPage';

function mockContext(overrides?: Parameters<typeof defaultContext>[0]) {
  vi.mocked(useKubeVipContext).mockReturnValue(defaultContext(overrides));
}

describe('OverviewPage', () => {
  it('shows loader when loading', () => {
    mockContext({ loading: true });
    render(<OverviewPage />);
    expect(screen.getByTestId('loader')).toHaveTextContent('Loading kube-vip data...');
  });

  it('shows error state', () => {
    mockContext({ error: 'api error' });
    render(<OverviewPage />);
    expect(screen.getByText('api error')).toBeInTheDocument();
  });

  it('shows "not detected" when kube-vip is not installed', () => {
    mockContext({ kubeVipInstalled: false });
    render(<OverviewPage />);
    expect(screen.getByText('kube-vip Not Detected')).toBeInTheDocument();
  });

  it('renders deployment info when installed', () => {
    const pod = makeSamplePod();
    mockContext({
      kubeVipInstalled: true,
      kubeVipPods: [pod],
      kubeVipConfig: {
        vip_arp: 'true',
        cp_enable: 'true',
        svc_enable: 'true',
        address: '192.168.1.100',
      },
    });
    render(<OverviewPage />);
    expect(screen.getByText('Deployment')).toBeInTheDocument();
    expect(screen.getByText('ARP')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('renders LoadBalancer services table', () => {
    const svc = makeSampleService();
    mockContext({
      kubeVipInstalled: true,
      kubeVipPods: [makeSamplePod()],
      loadBalancerServices: [svc],
    });
    render(<OverviewPage />);
    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.200')).toBeInTheDocument();
  });

  it('renders IP pools when available', () => {
    mockContext({
      kubeVipInstalled: true,
      kubeVipPods: [makeSamplePod()],
      ipPools: [
        { name: 'range-global', type: 'range', value: '10.0.0.100-10.0.0.200', scope: 'global' },
      ],
    });
    render(<OverviewPage />);
    expect(screen.getByText('range-global')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.100-10.0.0.200')).toBeInTheDocument();
  });

  it('shows cluster summary with node counts', () => {
    const node = makeSampleNode();
    const workerNode = makeSampleNode({
      metadata: { name: 'worker-1', labels: { 'kubernetes.io/hostname': 'worker-1' } },
    });
    mockContext({
      kubeVipInstalled: true,
      kubeVipPods: [makeSamplePod()],
      nodes: [node, workerNode],
    });
    render(<OverviewPage />);
    expect(screen.getByText('Cluster Summary')).toBeInTheDocument();
  });

  it('shows leader from leases', () => {
    const lease = makeSampleLease();
    mockContext({
      kubeVipInstalled: true,
      kubeVipPods: [makeSamplePod()],
      leases: [lease],
      kubeVipConfig: { vip_arp: 'true', cp_enable: 'true', svc_enable: 'true' },
    });
    render(<OverviewPage />);
    // "node-1" appears in both the Leader row and the pod table Node column;
    // verify it appears at least twice (leader + pod row)
    expect(screen.getAllByText('node-1').length).toBeGreaterThanOrEqual(2);
  });

  it('detects BGP mode', () => {
    mockContext({
      kubeVipInstalled: true,
      kubeVipPods: [makeSamplePod()],
      kubeVipConfig: { bgp_enable: 'true', cp_enable: 'true', svc_enable: 'true' },
    });
    render(<OverviewPage />);
    expect(screen.getByText('BGP')).toBeInTheDocument();
  });
});
