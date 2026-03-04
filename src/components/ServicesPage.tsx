/**
 * ServicesPage — LoadBalancer services managed by kube-vip.
 *
 * Shows all type:LoadBalancer services with VIP assignments, ports,
 * kube-vip annotations, and egress status.
 */

import {
  Loader,
  NameValueTable,
  SectionBox,
  SectionHeader,
  SimpleTable,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  formatAge,
  getServiceVIPs,
  getVipHost,
  isEgressEnabled,
  isKubeVipService,
  isServiceIgnored,
  KUBE_VIP_ANNOTATION_PREFIX,
  KubeVipService,
} from '../api/k8s';
import { useKubeVipContext } from '../api/KubeVipDataContext';

export default function ServicesPage() {
  const { loadBalancerServices, loading, error } = useKubeVipContext();

  const location = useLocation();
  const history = useHistory();
  const selectedName = location.hash ? decodeURIComponent(location.hash.slice(1)) : null;

  const selectedService = selectedName
    ? loadBalancerServices.find(s => `${s.metadata.namespace}/${s.metadata.name}` === selectedName)
    : null;

  const closePanel = () => history.push(location.pathname);

  useEffect(() => {
    if (!selectedName) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (loading) {
    return <Loader title="Loading services..." />;
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

  if (loadBalancerServices.length === 0) {
    return (
      <>
        <SectionHeader title="kube-vip — Services" />
        <SectionBox>
          <p>No LoadBalancer services found.</p>
        </SectionBox>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="kube-vip — Services" />

      <SectionBox title={`LoadBalancer Services (${loadBalancerServices.length})`}>
        <SimpleTable
          columns={[
            {
              label: 'Name',
              getter: s => (
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    history.push(`${location.pathname}#${s.metadata.namespace}/${s.metadata.name}`);
                  }}
                  style={{ color: 'var(--mui-palette-primary-main, #1976d2)', cursor: 'pointer' }}
                >
                  {s.metadata.name}
                </a>
              ),
            },
            { label: 'Namespace', getter: s => s.metadata.namespace ?? '—' },
            { label: 'VIP', getter: s => getServiceVIPs(s).join(', ') || 'Pending' },
            {
              label: 'Ports',
              getter: s =>
                s.spec.ports
                  ?.map(
                    (p: { port: number; protocol?: string }) => `${p.port}/${p.protocol ?? 'TCP'}`
                  )
                  .join(', ') ?? '—',
            },
            { label: 'VIP Host', getter: s => getVipHost(s) ?? '—' },
            {
              label: 'kube-vip',
              getter: s => (
                <StatusLabel status={isKubeVipService(s) ? 'success' : ''}>
                  {isKubeVipService(s) ? 'Yes' : '—'}
                </StatusLabel>
              ),
            },
            {
              label: 'Egress',
              getter: s => (isEgressEnabled(s) ? 'Yes' : '—'),
            },
            { label: 'Age', getter: s => formatAge(s.metadata.creationTimestamp) },
          ]}
          data={loadBalancerServices}
        />
      </SectionBox>

      {/* Detail slide-in panel */}
      {selectedService && (
        <>
          <div
            onClick={closePanel}
            aria-label="Close panel backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 1200,
            }}
          />
          <ServiceDetailPanel service={selectedService} onClose={closePanel} />
        </>
      )}
    </>
  );
}

function ServiceDetailPanel({
  service,
  onClose,
}: {
  service: KubeVipService;
  onClose: () => void;
}) {
  const vips = getServiceVIPs(service);
  const vipHost = getVipHost(service);
  const annotations = service.metadata.annotations ?? {};
  const kubeVipAnnotations = Object.entries(annotations).filter(([key]) =>
    key.startsWith(KUBE_VIP_ANNOTATION_PREFIX)
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '480px',
        height: '100vh',
        backgroundColor: 'var(--mui-palette-background-paper, #fff)',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
        zIndex: 1300,
        overflowY: 'auto',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px' }}>Service Details</h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
        >
          &times;
        </button>
      </div>

      <SectionBox title="General">
        <NameValueTable
          rows={[
            { name: 'Name', value: service.metadata.name },
            { name: 'Namespace', value: service.metadata.namespace ?? '—' },
            { name: 'Type', value: service.spec.type ?? '—' },
            { name: 'Cluster IP', value: service.spec.clusterIP ?? '—' },
            { name: 'VIP', value: vips.join(', ') || 'Pending' },
            ...(vipHost ? [{ name: 'VIP Host Node', value: vipHost }] : []),
            { name: 'External Traffic Policy', value: service.spec.externalTrafficPolicy ?? '—' },
            { name: 'Age', value: formatAge(service.metadata.creationTimestamp) },
          ]}
        />
      </SectionBox>

      {service.spec.ports && service.spec.ports.length > 0 && (
        <SectionBox title="Ports">
          <SimpleTable
            columns={[
              { label: 'Name', getter: p => p.name ?? '—' },
              { label: 'Port', getter: p => String(p.port) },
              { label: 'Target', getter: p => String(p.targetPort ?? '—') },
              { label: 'Protocol', getter: p => p.protocol ?? 'TCP' },
              ...(service.spec.ports?.some((p: { nodePort?: number }) => p.nodePort)
                ? [
                    {
                      label: 'NodePort',
                      getter: (p: { nodePort?: number }) => String(p.nodePort ?? '—'),
                    },
                  ]
                : []),
            ]}
            data={service.spec.ports}
          />
        </SectionBox>
      )}

      {kubeVipAnnotations.length > 0 && (
        <SectionBox title="kube-vip Annotations">
          <NameValueTable
            rows={kubeVipAnnotations.map(([key, value]) => ({
              name: key.replace(KUBE_VIP_ANNOTATION_PREFIX, ''),
              value,
            }))}
          />
        </SectionBox>
      )}

      {isServiceIgnored(service) && (
        <SectionBox title="Notice">
          <NameValueTable
            rows={[
              {
                name: 'Ignored',
                value: (
                  <StatusLabel status="warning">
                    This service has kube-vip.io/ignore=true — kube-vip will not manage it
                  </StatusLabel>
                ),
              },
            ]}
          />
        </SectionBox>
      )}
    </div>
  );
}
