import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock headlamp plugin APIs before importing the module under test
vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  ApiProxy: {
    request: vi.fn().mockResolvedValue({ items: [] }),
  },
  K8s: {
    ResourceClasses: {
      Service: {
        useList: vi.fn(() => [[], null]),
      },
      Node: {
        useList: vi.fn(() => [[], null]),
      },
    },
  },
}));

import { KubeVipDataProvider, useKubeVipContext } from './KubeVipDataContext';

describe('useKubeVipContext', () => {
  it('throws when used outside KubeVipDataProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useKubeVipContext());
    }).toThrow('useKubeVipContext must be used within a KubeVipDataProvider');

    spy.mockRestore();
  });

  it('returns context value when inside KubeVipDataProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <KubeVipDataProvider>{children}</KubeVipDataProvider>
    );

    const { result } = renderHook(() => useKubeVipContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.loadBalancerServices).toBeInstanceOf(Array);
    expect(result.current.nodes).toBeInstanceOf(Array);
    expect(result.current.kubeVipPods).toBeInstanceOf(Array);
    expect(result.current.cloudProviderPods).toBeInstanceOf(Array);
    expect(result.current.leases).toBeInstanceOf(Array);
    expect(result.current.ipPools).toBeInstanceOf(Array);
    expect(typeof result.current.refresh).toBe('function');
  });
});
