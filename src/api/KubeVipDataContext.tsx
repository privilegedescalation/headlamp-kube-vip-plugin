/**
 * KubeVipDataContext — shared data provider for kube-vip Kubernetes resources.
 *
 * Fetches Services (LoadBalancer), Nodes, kube-vip DaemonSet/pods,
 * Leases, and the kubevip ConfigMap. Provides filtered data to all
 * child pages via React context.
 */

import { ApiProxy, K8s } from '@kinvolk/headlamp-plugin/lib';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DaemonSetStatus,
  filterLoadBalancerServices,
  IPPool,
  isKubeList,
  KUBE_VIP_CLOUD_PROVIDER_SELECTOR,
  KUBE_VIP_CONFIGMAP_NAME,
  KUBE_VIP_DAEMONSET_NAME,
  KUBE_VIP_NAMESPACE,
  KUBE_VIP_POD_SELECTOR,
  KubeVipConfigMap,
  KubeVipDaemonSet,
  KubeVipLease,
  KubeVipNode,
  KubeVipPod,
  KubeVipService,
  parseIPPools,
} from './k8s';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface KubeVipContextValue {
  // kube-vip deployment
  kubeVipInstalled: boolean;
  daemonSetStatus: DaemonSetStatus | null;
  kubeVipPods: KubeVipPod[];
  cloudProviderPods: KubeVipPod[];

  // Services managed by kube-vip (type: LoadBalancer)
  loadBalancerServices: KubeVipService[];

  // Nodes
  nodes: KubeVipNode[];

  // Leader election
  leases: KubeVipLease[];

  // IP pool configuration
  ipPools: IPPool[];
  configMapData: Record<string, string>;

  // kube-vip configuration (from DaemonSet env vars)
  kubeVipConfig: Record<string, string>;

  // Loading / error state
  loading: boolean;
  error: string | null;

  // Manual refresh trigger
  refresh: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const KubeVipContext = createContext<KubeVipContextValue | null>(null);

export function useKubeVipContext(): KubeVipContextValue {
  const ctx = useContext(KubeVipContext);
  if (!ctx) {
    throw new Error('useKubeVipContext must be used within a KubeVipDataProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function KubeVipDataProvider({ children }: { children: React.ReactNode }) {
  // Async-fetched resources
  const [kubeVipPods, setKubeVipPods] = useState<KubeVipPod[]>([]);
  const [cloudProviderPods, setCloudProviderPods] = useState<KubeVipPod[]>([]);
  const [daemonSetStatus, setDaemonSetStatus] = useState<DaemonSetStatus | null>(null);
  const [leases, setLeases] = useState<KubeVipLease[]>([]);
  const [configMapData, setConfigMapData] = useState<Record<string, string>>({});
  const [kubeVipConfig, setKubeVipConfig] = useState<Record<string, string>>({});
  const [asyncLoading, setAsyncLoading] = useState(true);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // K8s resource hooks — Headlamp re-fetches on cluster changes automatically
  const [allServices, svcError] = K8s.ResourceClasses.Service.useList({ namespace: '' });
  const [allNodes, nodeError] = K8s.ResourceClasses.Node.useList();

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAsync() {
      setAsyncLoading(true);
      setAsyncError(null);
      try {
        // kube-vip DaemonSet
        try {
          const ds = (await ApiProxy.request(
            `/apis/apps/v1/namespaces/${KUBE_VIP_NAMESPACE}/daemonsets/${KUBE_VIP_DAEMONSET_NAME}`
          )) as KubeVipDaemonSet;
          if (!cancelled) {
            setDaemonSetStatus(ds.status ?? null);
            // Extract config from DaemonSet template env vars
            const env = ds.spec?.template?.spec?.containers?.[0]?.env;
            if (env) {
              const config: Record<string, string> = {};
              for (const e of env) {
                if (e.value !== undefined) config[e.name] = e.value;
              }
              setKubeVipConfig(config);
            }
          }
        } catch {
          if (!cancelled) {
            setDaemonSetStatus(null);
            setKubeVipConfig({});
          }
        }

        // kube-vip pods
        try {
          const podList = await ApiProxy.request(
            `/api/v1/namespaces/${KUBE_VIP_NAMESPACE}/pods?labelSelector=${encodeURIComponent(
              KUBE_VIP_POD_SELECTOR
            )}`
          );
          if (!cancelled && isKubeList(podList)) {
            setKubeVipPods(podList.items as KubeVipPod[]);
          }
        } catch {
          // If label selector doesn't match, try listing all pods in kube-system
          // and filtering by name prefix (for static pod deployments)
          try {
            const allPods = await ApiProxy.request(`/api/v1/namespaces/${KUBE_VIP_NAMESPACE}/pods`);
            if (!cancelled && isKubeList(allPods)) {
              const kvPods = (allPods.items as KubeVipPod[]).filter(p =>
                p.metadata.name.startsWith('kube-vip')
              );
              setKubeVipPods(kvPods);
            }
          } catch {
            if (!cancelled) setKubeVipPods([]);
          }
        }

        // kube-vip-cloud-provider pods
        try {
          const cpList = await ApiProxy.request(
            `/api/v1/namespaces/${KUBE_VIP_NAMESPACE}/pods?labelSelector=${encodeURIComponent(
              KUBE_VIP_CLOUD_PROVIDER_SELECTOR
            )}`
          );
          if (!cancelled && isKubeList(cpList)) {
            setCloudProviderPods(cpList.items as KubeVipPod[]);
          }
        } catch {
          if (!cancelled) setCloudProviderPods([]);
        }

        // Leases (kube-vip uses leases for leader election)
        try {
          const leaseList = await ApiProxy.request(
            `/apis/coordination.k8s.io/v1/namespaces/${KUBE_VIP_NAMESPACE}/leases`
          );
          if (!cancelled && isKubeList(leaseList)) {
            const kvLeases = (leaseList.items as KubeVipLease[]).filter(
              l => l.metadata.name.startsWith('plndr-') || l.metadata.name.startsWith('kube-vip-')
            );
            setLeases(kvLeases);
          }
        } catch {
          if (!cancelled) setLeases([]);
        }

        // kubevip ConfigMap (IP pool configuration)
        try {
          const cm = (await ApiProxy.request(
            `/api/v1/namespaces/${KUBE_VIP_NAMESPACE}/configmaps/${KUBE_VIP_CONFIGMAP_NAME}`
          )) as KubeVipConfigMap;
          if (!cancelled) {
            setConfigMapData(cm.data ?? {});
          }
        } catch {
          if (!cancelled) setConfigMapData({});
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setAsyncError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setAsyncLoading(false);
      }
    }

    void fetchAsync();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // ---------------------------------------------------------------------------
  // Derived / filtered values
  // ---------------------------------------------------------------------------

  const extractJsonData = (items: unknown[]): unknown[] =>
    items.map(item =>
      item && typeof item === 'object' && 'jsonData' in item
        ? (item as { jsonData: unknown }).jsonData
        : item
    );

  const loadBalancerServices = useMemo(() => {
    if (!allServices) return [];
    return filterLoadBalancerServices(extractJsonData(allServices as unknown[]));
  }, [allServices]);

  const nodes = useMemo(() => {
    if (!allNodes) return [];
    return extractJsonData(allNodes as unknown[]) as KubeVipNode[];
  }, [allNodes]);

  const ipPools = useMemo(() => parseIPPools(configMapData), [configMapData]);

  // ---------------------------------------------------------------------------
  // Combined loading / error state
  // ---------------------------------------------------------------------------

  const loading = asyncLoading || !allServices || !allNodes;

  const errors: string[] = [];
  if (svcError) errors.push(String(svcError));
  if (nodeError) errors.push(String(nodeError));
  if (asyncError) errors.push(asyncError);
  const error = errors.length > 0 ? errors.join('; ') : null;

  const kubeVipInstalled = kubeVipPods.length > 0 || daemonSetStatus !== null;

  // ---------------------------------------------------------------------------
  // Memoized context value
  // ---------------------------------------------------------------------------

  const value = useMemo<KubeVipContextValue>(
    () => ({
      kubeVipInstalled,
      daemonSetStatus,
      kubeVipPods,
      cloudProviderPods,
      loadBalancerServices,
      nodes,
      leases,
      ipPools,
      configMapData,
      kubeVipConfig,
      loading,
      error,
      refresh,
    }),
    [
      kubeVipInstalled,
      daemonSetStatus,
      kubeVipPods,
      cloudProviderPods,
      loadBalancerServices,
      nodes,
      leases,
      ipPools,
      configMapData,
      kubeVipConfig,
      loading,
      error,
      refresh,
    ]
  );

  return <KubeVipContext.Provider value={value}>{children}</KubeVipContext.Provider>;
}
