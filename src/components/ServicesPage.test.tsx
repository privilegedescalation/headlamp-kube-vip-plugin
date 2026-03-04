import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '@kinvolk/headlamp-plugin/lib/CommonComponents',
  async () => await import('./__mocks__/commonComponents')
);

let mockHash = '';
const mockPush = vi.fn();
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/kube-vip/services', hash: mockHash }),
  useHistory: () => ({ push: mockPush }),
}));

vi.mock('../api/KubeVipDataContext');

import { useKubeVipContext } from '../api/KubeVipDataContext';
import { defaultContext, makeSampleService } from '../test-helpers';
import ServicesPage from './ServicesPage';

function mockContext(overrides?: Parameters<typeof defaultContext>[0]) {
  vi.mocked(useKubeVipContext).mockReturnValue(defaultContext(overrides));
}

describe('ServicesPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockHash = '';
  });

  it('shows loader when loading', () => {
    mockContext({ loading: true });
    render(<ServicesPage />);
    expect(screen.getByTestId('loader')).toHaveTextContent('Loading services...');
  });

  it('shows error state', () => {
    mockContext({ error: 'fetch failed' });
    render(<ServicesPage />);
    expect(screen.getByText('fetch failed')).toBeInTheDocument();
  });

  it('shows empty message when no services', () => {
    mockContext({ loadBalancerServices: [] });
    render(<ServicesPage />);
    expect(screen.getByText('No LoadBalancer services found.')).toBeInTheDocument();
  });

  it('renders services table', () => {
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(<ServicesPage />);
    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.200')).toBeInTheDocument();
  });

  it('opens detail panel when clicking service name', () => {
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(<ServicesPage />);
    fireEvent.click(screen.getByText('my-service'));
    expect(mockPush).toHaveBeenCalledWith('/kube-vip/services#default/my-service');
  });

  it('renders detail panel when hash is set', () => {
    mockHash = '#default/my-service';
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(<ServicesPage />);
    expect(screen.getByText('Service Details')).toBeInTheDocument();
  });

  it('closes panel via backdrop click', () => {
    mockHash = '#default/my-service';
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(<ServicesPage />);
    fireEvent.click(screen.getByLabelText('Close panel backdrop'));
    expect(mockPush).toHaveBeenCalledWith('/kube-vip/services');
  });

  it('closes panel on Escape key', () => {
    mockHash = '#default/my-service';
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(<ServicesPage />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockPush).toHaveBeenCalledWith('/kube-vip/services');
  });

  it('shows kube-vip annotations in detail panel', () => {
    mockHash = '#default/my-service';
    const svc = makeSampleService();
    mockContext({ loadBalancerServices: [svc] });
    render(<ServicesPage />);
    expect(screen.getByText('kube-vip Annotations')).toBeInTheDocument();
    expect(screen.getByText('loadbalancerIPs')).toBeInTheDocument();
  });

  it('shows egress column for egress-enabled service', () => {
    const svc = makeSampleService({
      metadata: {
        name: 'egress-svc',
        namespace: 'default',
        annotations: {
          'kube-vip.io/loadbalancerIPs': '10.0.0.1',
          'kube-vip.io/egress': 'true',
        },
      },
    });
    mockContext({ loadBalancerServices: [svc] });
    render(<ServicesPage />);
    // The "Yes" text appears in the Egress column
    const cells = screen.getAllByRole('cell');
    expect(cells.some(c => c.textContent === 'Yes')).toBe(true);
  });
});
