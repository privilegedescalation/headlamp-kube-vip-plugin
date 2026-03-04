/**
 * ConfigPage — kube-vip configuration and IP pool management.
 *
 * Shows: kube-vip DaemonSet configuration (from env vars), IP pool
 * assignments from the kubevip ConfigMap, and leader election leases.
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
import { formatAge, getPodImage, isPodReady, phaseToStatus } from '../api/k8s';
import { useKubeVipContext } from '../api/KubeVipDataContext';

/** Display-friendly names for kube-vip environment variables. */
const ENV_LABELS: Record<string, string> = {
  address: 'VIP Address',
  port: 'VIP Port',
  vip_arp: 'ARP Mode',
  bgp_enable: 'BGP Mode',
  vip_interface: 'Interface',
  vip_leaderelection: 'Leader Election',
  vip_leaseduration: 'Lease Duration (s)',
  vip_renewdeadline: 'Renew Deadline (s)',
  vip_retryperiod: 'Retry Period (s)',
  cp_enable: 'Control Plane HA',
  svc_enable: 'Service LB',
  svc_election: 'Per-Service Election',
  lb_enable: 'IPVS Load Balancer',
  lb_port: 'LB Port',
  lb_fwdmethod: 'LB Forwarding Method',
  vip_servicesinterface: 'Services Interface',
  bgp_routerid: 'BGP Router ID',
  bgp_as: 'BGP Local AS',
  bgp_peeraddress: 'BGP Peer Address',
  bgp_peeras: 'BGP Peer AS',
  bgp_peers: 'BGP Peers',
  prometheus_server: 'Prometheus Server',
  vip_loglevel: 'Log Level',
  enable_node_labeling: 'Node Labeling',
  vip_subnet: 'VIP Subnet',
};

export default function ConfigPage() {
  const {
    kubeVipInstalled,
    kubeVipConfig,
    kubeVipPods,
    cloudProviderPods,
    daemonSetStatus,
    ipPools,
    configMapData,
    leases,
    loading,
    error,
  } = useKubeVipContext();

  if (loading) {
    return <Loader title="Loading configuration..." />;
  }

  if (error) {
    return (
      <SectionBox title="Error">
        <NameValueTable
          rows={[{ name: 'Status', value: <StatusLabel status="error">{error}</StatusLabel> }]}
        />
      </SectionBox>
    );
  }

  if (!kubeVipInstalled) {
    return (
      <>
        <SectionHeader title="kube-vip — Configuration" />
        <SectionBox>
          <p>kube-vip is not installed. No configuration available.</p>
        </SectionBox>
      </>
    );
  }

  // Build config rows from known env vars, in a defined order
  const configKeys = Object.keys(ENV_LABELS);
  const knownConfigRows = configKeys
    .filter(key => kubeVipConfig[key] !== undefined)
    .map(key => ({
      name: ENV_LABELS[key],
      value:
        kubeVipConfig[key] === 'true' ? (
          <StatusLabel status="success">Enabled</StatusLabel>
        ) : kubeVipConfig[key] === 'false' ? (
          'Disabled'
        ) : (
          kubeVipConfig[key]
        ),
    }));

  // Extra env vars not in our known list
  const extraConfigRows = Object.entries(kubeVipConfig)
    .filter(([key]) => !configKeys.includes(key))
    .map(([key, value]) => ({ name: key, value }));

  return (
    <>
      <SectionHeader title="kube-vip — Configuration" />

      {/* DaemonSet status */}
      {daemonSetStatus && (
        <SectionBox title="DaemonSet Status">
          <NameValueTable
            rows={[
              { name: 'Desired', value: String(daemonSetStatus.desiredNumberScheduled ?? 0) },
              { name: 'Current', value: String(daemonSetStatus.currentNumberScheduled ?? 0) },
              { name: 'Ready', value: String(daemonSetStatus.numberReady ?? 0) },
              { name: 'Available', value: String(daemonSetStatus.numberAvailable ?? 0) },
              { name: 'Updated', value: String(daemonSetStatus.updatedNumberScheduled ?? 0) },
              ...(daemonSetStatus.numberMisscheduled
                ? [
                  {
                    name: 'Misscheduled',
                    value: (
                      <StatusLabel status="warning">
                        {daemonSetStatus.numberMisscheduled}
                      </StatusLabel>
                    ),
                  },
                ]
                : []),
            ]}
          />
        </SectionBox>
      )}

      {/* kube-vip configuration from env vars */}
      {knownConfigRows.length > 0 && (
        <SectionBox title="kube-vip Configuration">
          <NameValueTable rows={knownConfigRows} />
        </SectionBox>
      )}

      {extraConfigRows.length > 0 && (
        <SectionBox title="Additional Environment Variables">
          <NameValueTable rows={extraConfigRows} />
        </SectionBox>
      )}

      {/* IP Pools from ConfigMap */}
      {ipPools.length > 0 && (
        <SectionBox title="IP Address Pools">
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

      {Object.keys(configMapData).length === 0 && ipPools.length === 0 && (
        <SectionBox title="IP Address Pools">
          <p>
            No kubevip ConfigMap found. IP pools are not configured (kube-vip-cloud-provider may not
            be installed).
          </p>
        </SectionBox>
      )}

      {/* Leader Election Leases */}
      {leases.length > 0 && (
        <SectionBox title="Leader Election Leases">
          <SimpleTable
            columns={[
              { label: 'Name', getter: l => l.metadata.name },
              { label: 'Holder', getter: l => l.spec?.holderIdentity ?? '—' },
              { label: 'Duration (s)', getter: l => String(l.spec?.leaseDurationSeconds ?? '—') },
              { label: 'Transitions', getter: l => String(l.spec?.leaseTransitions ?? 0) },
              { label: 'Last Renewed', getter: l => formatAge(l.spec?.renewTime) },
            ]}
            data={leases}
          />
        </SectionBox>
      )}

      {/* Pod details */}
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
              { label: 'Image', getter: p => getPodImage(p) },
              { label: 'Age', getter: p => formatAge(p.metadata.creationTimestamp) },
            ]}
            data={kubeVipPods}
          />
        </SectionBox>
      )}

      {cloudProviderPods.length > 0 && (
        <SectionBox title="Cloud Provider Pods">
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
              { label: 'Image', getter: p => getPodImage(p) },
              { label: 'Age', getter: p => formatAge(p.metadata.creationTimestamp) },
            ]}
            data={cloudProviderPods}
          />
        </SectionBox>
      )}
    </>
  );
}
