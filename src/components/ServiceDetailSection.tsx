/**
 * ServiceDetailSection — injected into Headlamp's native Service detail view.
 *
 * Displays kube-vip-specific information for LoadBalancer services:
 * VIP assignments, annotations, egress status.
 */

import {
  NameValueTable,
  SectionBox,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import {
  ANNOTATION_LOADBALANCER_IPS,
  getServiceVIPs,
  getVipHost,
  isEgressEnabled,
  isServiceIgnored,
  KUBE_VIP_ANNOTATION_PREFIX,
} from '../api/k8s';
import { useKubeVipContext } from '../api/KubeVipDataContext';

interface ServiceDetailSectionProps {
  resource: { metadata: { name: string; namespace?: string }; spec?: { type?: string } };
}

export default function ServiceDetailSection({ resource }: ServiceDetailSectionProps) {
  const { loadBalancerServices, loading } = useKubeVipContext();

  if (loading) return null;

  // Only show for LoadBalancer services
  if (resource.spec?.type !== 'LoadBalancer') return null;

  // Find the matching service in our filtered list
  const svc = loadBalancerServices.find(
    s =>
      s.metadata.name === resource.metadata.name &&
      s.metadata.namespace === resource.metadata.namespace
  );

  if (!svc) return null;

  // Check if this service has any kube-vip annotations
  const annotations = svc.metadata.annotations ?? {};
  const hasKubeVipAnnotations = Object.keys(annotations).some(k =>
    k.startsWith(KUBE_VIP_ANNOTATION_PREFIX)
  );

  // If no kube-vip annotations, still show VIP info from status
  const vips = getServiceVIPs(svc);
  if (!hasKubeVipAnnotations && vips.length === 0) return null;

  const vipHost = getVipHost(svc);
  const kubeVipAnnotations = Object.entries(annotations).filter(([key]) =>
    key.startsWith(KUBE_VIP_ANNOTATION_PREFIX)
  );

  return (
    <SectionBox title="kube-vip Details">
      <NameValueTable
        rows={[
          {
            name: 'VIP',
            value: vips.length > 0 ? vips.join(', ') : 'Pending',
          },
          ...(vipHost ? [{ name: 'VIP Host Node', value: vipHost }] : []),
          ...(isEgressEnabled(svc)
            ? [
                {
                  name: 'Egress',
                  value: <StatusLabel status="success">Enabled</StatusLabel>,
                },
              ]
            : []),
          ...(isServiceIgnored(svc)
            ? [
                {
                  name: 'Ignored',
                  value: (
                    <StatusLabel status="warning">kube-vip is ignoring this service</StatusLabel>
                  ),
                },
              ]
            : []),
          ...kubeVipAnnotations
            .filter(([key]) => key !== ANNOTATION_LOADBALANCER_IPS)
            .map(([key, value]) => ({
              name: key.replace(KUBE_VIP_ANNOTATION_PREFIX, ''),
              value,
            })),
        ]}
      />
    </SectionBox>
  );
}
