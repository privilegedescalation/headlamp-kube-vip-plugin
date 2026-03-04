/**
 * headlamp-kube-vip-plugin — entry point.
 *
 * Registers sidebar entries, routes, and detail view sections for
 * kube-vip virtual IP and load balancer visibility in Headlamp.
 */

import {
  registerDetailsViewSection,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { KubeVipDataProvider } from './api/KubeVipDataContext';
import ConfigPage from './components/ConfigPage';
import NodesPage from './components/NodesPage';
import OverviewPage from './components/OverviewPage';
import ServiceDetailSection from './components/ServiceDetailSection';
import ServicesPage from './components/ServicesPage';

// ---------------------------------------------------------------------------
// Sidebar entries
// ---------------------------------------------------------------------------

registerSidebarEntry({
  parent: null,
  name: 'kube-vip',
  label: 'kube-vip',
  url: '/kube-vip',
  icon: 'mdi:ip-network',
});

registerSidebarEntry({
  parent: 'kube-vip',
  name: 'kube-vip-overview',
  label: 'Overview',
  url: '/kube-vip',
  icon: 'mdi:view-dashboard',
});

registerSidebarEntry({
  parent: 'kube-vip',
  name: 'kube-vip-services',
  label: 'Services',
  url: '/kube-vip/services',
  icon: 'mdi:lan',
});

registerSidebarEntry({
  parent: 'kube-vip',
  name: 'kube-vip-nodes',
  label: 'Nodes',
  url: '/kube-vip/nodes',
  icon: 'mdi:server',
});

registerSidebarEntry({
  parent: 'kube-vip',
  name: 'kube-vip-config',
  label: 'Configuration',
  url: '/kube-vip/config',
  icon: 'mdi:cog',
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

registerRoute({
  path: '/kube-vip',
  sidebar: 'kube-vip-overview',
  name: 'kube-vip-overview',
  exact: true,
  component: () => (
    <KubeVipDataProvider>
      <OverviewPage />
    </KubeVipDataProvider>
  ),
});

registerRoute({
  path: '/kube-vip/services',
  sidebar: 'kube-vip-services',
  name: 'kube-vip-services',
  exact: true,
  component: () => (
    <KubeVipDataProvider>
      <ServicesPage />
    </KubeVipDataProvider>
  ),
});

registerRoute({
  path: '/kube-vip/nodes',
  sidebar: 'kube-vip-nodes',
  name: 'kube-vip-nodes',
  exact: true,
  component: () => (
    <KubeVipDataProvider>
      <NodesPage />
    </KubeVipDataProvider>
  ),
});

registerRoute({
  path: '/kube-vip/config',
  sidebar: 'kube-vip-config',
  name: 'kube-vip-config',
  exact: true,
  component: () => (
    <KubeVipDataProvider>
      <ConfigPage />
    </KubeVipDataProvider>
  ),
});

// ---------------------------------------------------------------------------
// Detail view section — Service pages (LoadBalancer type)
// ---------------------------------------------------------------------------

registerDetailsViewSection(({ resource }) => {
  if (resource?.kind !== 'Service') return null;
  return (
    <KubeVipDataProvider>
      <ServiceDetailSection resource={resource} />
    </KubeVipDataProvider>
  );
});
