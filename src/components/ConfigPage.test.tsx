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
  makeSampleDaemonSetStatus,
  makeSampleLease,
  makeSamplePod,
} from '../test-helpers';
import ConfigPage from './ConfigPage';

function mockContext(overrides?: Parameters<typeof defaultContext>[0]) {
  vi.mocked(useKubeVipContext).mockReturnValue(defaultContext(overrides));
}

describe('ConfigPage', () => {
  it('shows loader when loading', () => {
    mockContext({ loading: true });
    render(<ConfigPage />);
    expect(screen.getByTestId('loader')).toHaveTextContent('Loading configuration...');
  });

  it('shows error state', () => {
    mockContext({ error: 'config error' });
    render(<ConfigPage />);
    expect(screen.getByText('config error')).toBeInTheDocument();
  });

  it('shows not installed message when kube-vip is absent', () => {
    mockContext({ kubeVipInstalled: false });
    render(<ConfigPage />);
    expect(screen.getByText(/not installed/)).toBeInTheDocument();
  });

  it('renders DaemonSet status when available', () => {
    mockContext({
      kubeVipInstalled: true,
      daemonSetStatus: makeSampleDaemonSetStatus(),
    });
    render(<ConfigPage />);
    expect(screen.getByText('DaemonSet Status')).toBeInTheDocument();
  });

  it('renders kube-vip configuration from env vars', () => {
    mockContext({
      kubeVipInstalled: true,
      kubeVipConfig: {
        address: '192.168.1.100',
        vip_arp: 'true',
        cp_enable: 'true',
        svc_enable: 'false',
        vip_interface: 'eth0',
      },
    });
    render(<ConfigPage />);
    expect(screen.getByText('kube-vip Configuration')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('eth0')).toBeInTheDocument();
  });

  it('renders IP pools table', () => {
    mockContext({
      kubeVipInstalled: true,
      ipPools: [
        { name: 'range-global', type: 'range', value: '10.0.0.100-10.0.0.200', scope: 'global' },
      ],
      configMapData: { 'range-global': '10.0.0.100-10.0.0.200' },
    });
    render(<ConfigPage />);
    expect(screen.getByText('IP Address Pools')).toBeInTheDocument();
    expect(screen.getByText('range-global')).toBeInTheDocument();
  });

  it('shows no IP pools message when empty', () => {
    mockContext({
      kubeVipInstalled: true,
      ipPools: [],
      configMapData: {},
    });
    render(<ConfigPage />);
    expect(screen.getByText(/No kubevip ConfigMap found/)).toBeInTheDocument();
  });

  it('renders leader election leases', () => {
    const lease = makeSampleLease();
    mockContext({
      kubeVipInstalled: true,
      leases: [lease],
    });
    render(<ConfigPage />);
    expect(screen.getByText('Leader Election Leases')).toBeInTheDocument();
    expect(screen.getByText('plndr-cp-lock')).toBeInTheDocument();
  });

  it('renders kube-vip pods section', () => {
    const pod = makeSamplePod();
    mockContext({
      kubeVipInstalled: true,
      kubeVipPods: [pod],
    });
    render(<ConfigPage />);
    expect(screen.getByText('kube-vip Pods')).toBeInTheDocument();
    expect(screen.getByText('kube-vip-ds-abc12')).toBeInTheDocument();
  });
});
