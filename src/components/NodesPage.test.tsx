import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '@kinvolk/headlamp-plugin/lib/CommonComponents',
  async () => await import('./__mocks__/commonComponents')
);

vi.mock('../api/KubeVipDataContext');

import { useKubeVipContext } from '../api/KubeVipDataContext';
import { defaultContext, makeSampleLease, makeSampleNode, makeSamplePod } from '../test-helpers';
import NodesPage from './NodesPage';

function mockContext(overrides?: Parameters<typeof defaultContext>[0]) {
  vi.mocked(useKubeVipContext).mockReturnValue(defaultContext(overrides));
}

describe('NodesPage', () => {
  it('shows loader when loading', () => {
    mockContext({ loading: true });
    render(<NodesPage />);
    expect(screen.getByTestId('loader')).toHaveTextContent('Loading nodes...');
  });

  it('shows error state', () => {
    mockContext({ error: 'nodes error' });
    render(<NodesPage />);
    expect(screen.getByText('nodes error')).toBeInTheDocument();
  });

  it('renders control plane nodes section', () => {
    const node = makeSampleNode();
    const pod = makeSamplePod();
    mockContext({ nodes: [node], kubeVipPods: [pod] });
    render(<NodesPage />);
    expect(screen.getByText('Control Plane Nodes (1)')).toBeInTheDocument();
    expect(screen.getByText('node-1')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
  });

  it('renders worker nodes section', () => {
    const worker = makeSampleNode({
      metadata: { name: 'worker-1', labels: { 'kubernetes.io/hostname': 'worker-1' } },
    });
    mockContext({ nodes: [worker] });
    render(<NodesPage />);
    expect(screen.getByText('Worker Nodes (1)')).toBeInTheDocument();
    expect(screen.getByText('worker-1')).toBeInTheDocument();
  });

  it('shows leader status for nodes with matching lease', () => {
    const node = makeSampleNode();
    const lease = makeSampleLease();
    const pod = makeSamplePod();
    mockContext({ nodes: [node], leases: [lease], kubeVipPods: [pod] });
    render(<NodesPage />);
    // "Leader" appears as both a column header and a StatusLabel value
    expect(screen.getAllByText('Leader').length).toBeGreaterThanOrEqual(2);
  });

  it('shows kube-vip pod status per node', () => {
    const node = makeSampleNode();
    const pod = makeSamplePod();
    mockContext({ nodes: [node], kubeVipPods: [pod] });
    render(<NodesPage />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows kubelet version', () => {
    const node = makeSampleNode();
    mockContext({ nodes: [node] });
    render(<NodesPage />);
    expect(screen.getByText('v1.30.0')).toBeInTheDocument();
  });
});
