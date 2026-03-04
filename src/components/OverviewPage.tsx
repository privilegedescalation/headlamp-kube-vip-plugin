/**
 * OverviewPage — main dashboard for the kube-vip plugin.
 *
 * Shows: deployment status, VIP mode, leader election, service/node counts,
 * IP pool summary, and pod health.
 */

import {
  Loader,
  NameValueTable,
  SectionBox,
  SectionHeader,
  SimpleTable,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import {
  formatAge,
  getServiceVIPs,
  isControlPlaneNode,
  isEgressEnabled,
  isKubeVipService,
  isPodReady,
  phaseToStatus,
} from '../api/k8s';
import { useKubeVipContext } from '../api/KubeVipDataContext';

export default function OverviewPage() {
  const {
    kubeVipInstalled,
    daemonSetStatus,
    kubeVipPods,
    cloudProviderPods,
    loadBalancerServices,
    nodes,
    leases,
    ipPools,
    kubeVipConfig,
    loading,
    error,
    refresh,
  } = useKubeVipContext();

  if (loading) {
    return <Loader title="Loading kube-vip data..." />;
  }

  const controlPlaneNodes = nodes.filter(isControlPlaneNode);
  const readyPods = kubeVipPods.filter(isPodReady);
  const kubeVipManaged = loadBalancerServices.filter(isKubeVipService);
  const egressEnabled = loadBalancerServices.filter(isEgressEnabled);

  // Detect mode from config
  const mode =
    kubeVipConfig['bgp_enable'] === 'true'
      ? 'BGP'
      : kubeVipConfig['vip_arp'] === 'true'
        ? 'ARP'
        : kubeVipPods.length > 0
          ? 'Unknown'
          : '—';

  const cpEnabled = kubeVipConfig['cp_enable'] === 'true';
  const svcEnabled = kubeVipConfig['svc_enable'] === 'true';
  const controlPlaneVIP = kubeVipConfig['address'] ?? '—';

  // Find leader from leases
  const cpLease = leases.find(l => l.metadata.name.startsWith('plndr-cp-lock'));
  const svcLease = leases.find(l => l.metadata.name.startsWith('plndr-svcs-lock'));
  const leaderNode = cpLease?.spec?.holderIdentity ?? svcLease?.spec?.holderIdentity ?? '—';

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <SectionHeader title="kube-vip — Overview" />
        <button
          onClick={refresh}
          aria-label="Refresh kube-vip data"
          style={{
            padding: '6px 16px',
            backgroundColor: 'transparent',
            color: 'var(--mui-palette-primary-main, #1976d2)',
            border: '1px solid var(--mui-palette-primary-main, #1976d2)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Refresh
        </button>
      </div>

      {!kubeVipInstalled && (
        <SectionBox title="kube-vip Not Detected">
          <NameValueTable
            rows={[
              {
                name: 'Status',
                value: (
                  <StatusLabel status="error">No kube-vip pods found in kube-system</StatusLabel>
                ),
              },
              {
                name: 'Install',
                value: 'See https://kube-vip.io/docs/installation/',
              },
            ]}
          />
        </SectionBox>
      )}

      {error && (
        <SectionBox title="Error">
          <NameValueTable
            rows={[{ name: 'Status', value: <StatusLabel status="error">{error}</StatusLabel> }]}
          />
        </SectionBox>
      )}

      {kubeVipInstalled && (
        <>
          <SectionBox title="Deployment">
            <NameValueTable
              rows={[
                {
                  name: 'Status',
                  value: (
                    <StatusLabel status={readyPods.length > 0 ? 'success' : 'error'}>
                      {readyPods.length > 0 ? 'Running' : 'Unhealthy'}
                    </StatusLabel>
                  ),
                },
                { name: 'Mode', value: mode },
                { name: 'Control Plane HA', value: cpEnabled ? 'Enabled' : 'Disabled' },
                { name: 'Service LoadBalancer', value: svcEnabled ? 'Enabled' : 'Disabled' },
                ...(cpEnabled ? [{ name: 'Control Plane VIP', value: controlPlaneVIP }] : []),
                { name: 'Leader', value: leaderNode },
                {
                  name: 'Pods',
                  value: `${readyPods.length}/${kubeVipPods.length} ready`,
                },
                ...(daemonSetStatus
                  ? [
                    {
                      name: 'DaemonSet',
                      value: `${daemonSetStatus.numberReady ?? 0}/${
                        daemonSetStatus.desiredNumberScheduled ?? 0
                      } ready`,
                    },
                  ]
                  : []),
                ...(cloudProviderPods.length > 0
                  ? [
                    {
                      name: 'Cloud Provider',
                      value: (
                        <StatusLabel
                          status={cloudProviderPods.some(isPodReady) ? 'success' : 'warning'}
                        >
                          {cloudProviderPods.length} pod(s)
                        </StatusLabel>
                      ),
                    },
                  ]
                  : []),
              ]}
            />
          </SectionBox>

          <SectionBox title="Cluster Summary">
            <NameValueTable
              rows={[
                { name: 'Total Nodes', value: String(nodes.length) },
                { name: 'Control Plane Nodes', value: String(controlPlaneNodes.length) },
                { name: 'LoadBalancer Services', value: String(loadBalancerServices.length) },
                { name: 'kube-vip Managed', value: String(kubeVipManaged.length) },
                ...(egressEnabled.length > 0
                  ? [
                    {
                      name: 'Egress Enabled',
                      value: String(egressEnabled.length),
                    },
                  ]
                  : []),
                { name: 'IP Pools', value: String(ipPools.length) },
                { name: 'Leader Election Leases', value: String(leases.length) },
              ]}
            />
          </SectionBox>

          {ipPools.length > 0 && (
            <SectionBox title="IP Pools">
              <SimpleTable
                columns={[
                  { label: 'Name', getter: p => p.name },
                  { label: 'Type', getter: p => p.type.toUpperCase() },
                  { label: 'Value', getter: p => p.value },
                  {
                    label: 'Scope',
                    getter: p => (p.scope === 'namespace' ? p.namespace ?? '—' : 'Global'),
                  },
                ]}
                data={ipPools}
              />
            </SectionBox>
          )}

          {kubeVipPods.length > 0 && (
            <SectionBox title="kube-vip Pods">
              <SimpleTable
                columns={[
                  { label: 'Name', getter: p => p.metadata.name },
                  { label: 'Node', getter: p => p.spec?.nodeName ?? '—' },
                  {
                    label: 'Status',
                    getter: p => (
                      <StatusLabel status={phaseToStatus(p.status?.phase)}>
                        {p.status?.phase ?? 'Unknown'}
                      </StatusLabel>
                    ),
                  },
                  {
                    label: 'Ready',
                    getter: p => (isPodReady(p) ? 'Yes' : 'No'),
                  },
                  { label: 'Age', getter: p => formatAge(p.metadata.creationTimestamp) },
                ]}
                data={kubeVipPods}
              />
            </SectionBox>
          )}

          {loadBalancerServices.length > 0 && (
            <SectionBox title="LoadBalancer Services">
              <SimpleTable
                columns={[
                  { label: 'Name', getter: s => s.metadata.name },
                  { label: 'Namespace', getter: s => s.metadata.namespace ?? '—' },
                  { label: 'VIP', getter: s => getServiceVIPs(s).join(', ') || '—' },
                  {
                    label: 'Ports',
                    getter: s =>
                      s.spec.ports
                        ?.map(
                          (p: { port: number; protocol?: string }) =>
                            `${p.port}/${p.protocol ?? 'TCP'}`
                        )
                        .join(', ') ?? '—',
                  },
                  { label: 'Age', getter: s => formatAge(s.metadata.creationTimestamp) },
                ]}
                data={loadBalancerServices}
              />
            </SectionBox>
          )}
        </>
      )}
    </>
  );
}
