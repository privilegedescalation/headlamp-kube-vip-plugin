/**
 * NodesPage — cluster nodes with kube-vip VIP assignments.
 *
 * Shows all nodes with their roles, readiness, kube-vip pod status,
 * and any VIP labels applied by kube-vip.
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
  getNodeInternalIP,
  getNodeVipLabel,
  isControlPlaneNode,
  isNodeReady,
} from '../api/k8s';
import { useKubeVipContext } from '../api/KubeVipDataContext';

export default function NodesPage() {
  const { nodes, kubeVipPods, leases, loading, error } = useKubeVipContext();

  if (loading) {
    return <Loader title="Loading nodes..." />;
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

  // Build a map of node → kube-vip pod
  const podByNode = new Map<string, (typeof kubeVipPods)[0]>();
  for (const pod of kubeVipPods) {
    if (pod.spec?.nodeName) {
      podByNode.set(pod.spec.nodeName, pod);
    }
  }

  // Determine leader from leases
  const leaderIdentities = new Set<string>();
  for (const lease of leases) {
    if (lease.spec?.holderIdentity) {
      leaderIdentities.add(lease.spec.holderIdentity);
    }
  }

  const controlPlane = nodes.filter(isControlPlaneNode);
  const workers = nodes.filter(n => !isControlPlaneNode(n));

  return (
    <>
      <SectionHeader title="kube-vip — Nodes" />

      {controlPlane.length > 0 && (
        <SectionBox title={`Control Plane Nodes (${controlPlane.length})`}>
          <SimpleTable
            columns={[
              { label: 'Name', getter: n => n.metadata.name },
              { label: 'IP', getter: n => getNodeInternalIP(n) },
              {
                label: 'Ready',
                getter: n => (
                  <StatusLabel status={isNodeReady(n) ? 'success' : 'error'}>
                    {isNodeReady(n) ? 'Ready' : 'NotReady'}
                  </StatusLabel>
                ),
              },
              {
                label: 'kube-vip Pod',
                getter: n => {
                  const pod = podByNode.get(n.metadata.name);
                  if (!pod) return '—';
                  return (
                    <StatusLabel status={pod.status?.phase === 'Running' ? 'success' : 'warning'}>
                      {pod.status?.phase ?? 'Unknown'}
                    </StatusLabel>
                  );
                },
              },
              {
                label: 'Leader',
                getter: n =>
                  leaderIdentities.has(n.metadata.name) ? (
                    <StatusLabel status="success">Leader</StatusLabel>
                  ) : (
                    '—'
                  ),
              },
              { label: 'VIP Label', getter: n => getNodeVipLabel(n) ?? '—' },
              { label: 'Kubelet', getter: n => n.status?.nodeInfo?.kubeletVersion ?? '—' },
              { label: 'Age', getter: n => formatAge(n.metadata.creationTimestamp) },
            ]}
            data={controlPlane}
          />
        </SectionBox>
      )}

      {workers.length > 0 && (
        <SectionBox title={`Worker Nodes (${workers.length})`}>
          <SimpleTable
            columns={[
              { label: 'Name', getter: n => n.metadata.name },
              { label: 'IP', getter: n => getNodeInternalIP(n) },
              {
                label: 'Ready',
                getter: n => (
                  <StatusLabel status={isNodeReady(n) ? 'success' : 'error'}>
                    {isNodeReady(n) ? 'Ready' : 'NotReady'}
                  </StatusLabel>
                ),
              },
              {
                label: 'kube-vip Pod',
                getter: n => {
                  const pod = podByNode.get(n.metadata.name);
                  if (!pod) return '—';
                  return (
                    <StatusLabel status={pod.status?.phase === 'Running' ? 'success' : 'warning'}>
                      {pod.status?.phase ?? 'Unknown'}
                    </StatusLabel>
                  );
                },
              },
              { label: 'Kubelet', getter: n => n.status?.nodeInfo?.kubeletVersion ?? '—' },
              { label: 'Age', getter: n => formatAge(n.metadata.creationTimestamp) },
            ]}
            data={workers}
          />
        </SectionBox>
      )}
    </>
  );
}
