/**
 * Kubernetes type definitions and helper functions for kube-vip resources.
 *
 * kube-vip uses no CRDs — all state is in standard Kubernetes resources
 * (DaemonSets, Pods, Services, Nodes, Leases, ConfigMaps).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const KUBE_VIP_NAMESPACE = 'kube-system' as const;
export const KUBE_VIP_DAEMONSET_NAME = 'kube-vip-ds' as const;
export const KUBE_VIP_CLOUD_PROVIDER_NAME = 'kube-vip-cloud-provider' as const;
export const KUBE_VIP_CONFIGMAP_NAME = 'kubevip' as const;
export const KUBE_VIP_ANNOTATION_PREFIX = 'kube-vip.io/' as const;
export const KUBE_VIP_METRICS_PORT = 2112 as const;

/** Label selectors for kube-vip pods. */
export const KUBE_VIP_POD_SELECTOR = 'app.kubernetes.io/name=kube-vip-ds';
export const KUBE_VIP_CLOUD_PROVIDER_SELECTOR = 'app=kube-vip-cloud-provider';

// ---------------------------------------------------------------------------
// Annotation keys
// ---------------------------------------------------------------------------

export const ANNOTATION_LOADBALANCER_IPS = 'kube-vip.io/loadbalancerIPs';
export const ANNOTATION_IGNORE = 'kube-vip.io/ignore';
export const ANNOTATION_VIP_HOST = 'kube-vip.io/vipHost';
export const ANNOTATION_EGRESS = 'kube-vip.io/egress';
export const ANNOTATION_SERVICE_INTERFACE = 'kube-vip.io/serviceInterface';
export const ANNOTATION_HOSTNAME = 'kube-vip.io/loadbalancerHostname';

// ---------------------------------------------------------------------------
// Generic Kubernetes object base shapes
// ---------------------------------------------------------------------------

export interface KubeObjectMeta {
  name: string;
  namespace?: string;
  creationTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  uid?: string;
}

export interface KubeObject {
  apiVersion?: string;
  kind?: string;
  metadata: KubeObjectMeta;
}

// ---------------------------------------------------------------------------
// K8s API list response envelope
// ---------------------------------------------------------------------------

export interface KubeList<T> {
  items: T[];
  metadata?: { resourceVersion?: string };
}

export function isKubeList(value: unknown): value is KubeList<unknown> {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray((value as Record<string, unknown>)['items']);
}

// ---------------------------------------------------------------------------
// Service (LoadBalancer)
// ---------------------------------------------------------------------------

export interface ServicePort {
  name?: string;
  protocol?: string;
  port: number;
  targetPort?: number | string;
  nodePort?: number;
}

export interface ServiceSpec {
  type?: string;
  clusterIP?: string;
  externalTrafficPolicy?: string;
  loadBalancerIP?: string;
  ports?: ServicePort[];
  selector?: Record<string, string>;
}

export interface ServiceStatus {
  loadBalancer?: {
    ingress?: Array<{ ip?: string; hostname?: string }>;
  };
}

export interface KubeVipService extends KubeObject {
  spec: ServiceSpec;
  status?: ServiceStatus;
}

/** Returns true if a Service is of type LoadBalancer. */
export function isLoadBalancerService(svc: unknown): svc is KubeVipService {
  if (!svc || typeof svc !== 'object') return false;
  const obj = svc as Record<string, unknown>;
  const spec = obj['spec'] as Record<string, unknown> | undefined;
  return spec?.['type'] === 'LoadBalancer';
}

/** Returns true if a LoadBalancer service has a kube-vip annotation. */
export function isKubeVipService(svc: KubeVipService): boolean {
  const annotations = svc.metadata.annotations ?? {};
  return Object.keys(annotations).some(key => key.startsWith(KUBE_VIP_ANNOTATION_PREFIX));
}

/** Get the VIP address(es) from a service. */
export function getServiceVIPs(svc: KubeVipService): string[] {
  // Check kube-vip annotation first
  const annotatedIPs = svc.metadata.annotations?.[ANNOTATION_LOADBALANCER_IPS];
  if (annotatedIPs) return annotatedIPs.split(',').map(ip => ip.trim());

  // Fall back to status.loadBalancer.ingress
  const ingress = svc.status?.loadBalancer?.ingress;
  if (ingress && ingress.length > 0) {
    return ingress.map(i => i.ip ?? i.hostname ?? '').filter(Boolean);
  }

  // Fall back to spec.loadBalancerIP
  if (svc.spec.loadBalancerIP) return [svc.spec.loadBalancerIP];

  return [];
}

/** Get the node currently hosting the VIP for this service. */
export function getVipHost(svc: KubeVipService): string | undefined {
  return svc.metadata.annotations?.[ANNOTATION_VIP_HOST];
}

/** Check if egress is enabled on this service. */
export function isEgressEnabled(svc: KubeVipService): boolean {
  return svc.metadata.annotations?.[ANNOTATION_EGRESS] === 'true';
}

/** Check if service is ignored by kube-vip. */
export function isServiceIgnored(svc: KubeVipService): boolean {
  return svc.metadata.annotations?.[ANNOTATION_IGNORE] === 'true';
}

/** Filter LoadBalancer services from a list of unknown objects. */
export function filterLoadBalancerServices(items: unknown[]): KubeVipService[] {
  return items.filter(isLoadBalancerService);
}

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

export interface NodeAddress {
  type: string;
  address: string;
}

export interface NodeCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface NodeStatus {
  conditions?: NodeCondition[];
  addresses?: NodeAddress[];
  nodeInfo?: {
    kubeletVersion?: string;
    osImage?: string;
    containerRuntimeVersion?: string;
    architecture?: string;
  };
  allocatable?: Record<string, string>;
  capacity?: Record<string, string>;
}

export interface NodeSpec {
  podCIDR?: string;
  taints?: Array<{ key: string; effect: string; value?: string }>;
}

export interface KubeVipNode extends KubeObject {
  spec?: NodeSpec;
  status?: NodeStatus;
}

/** Check if a node is Ready. */
export function isNodeReady(node: KubeVipNode): boolean {
  return node.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True') ?? false;
}

/** Get the InternalIP of a node. */
export function getNodeInternalIP(node: KubeVipNode): string {
  return node.status?.addresses?.find(a => a.type === 'InternalIP')?.address ?? '—';
}

/** Check if a node is a control plane node. */
export function isControlPlaneNode(node: KubeVipNode): boolean {
  const labels = node.metadata.labels ?? {};
  return (
    'node-role.kubernetes.io/control-plane' in labels || 'node-role.kubernetes.io/master' in labels
  );
}

/** Get kube-vip VIP label from a node (if node labeling is enabled). */
export function getNodeVipLabel(node: KubeVipNode): string | undefined {
  const labels = node.metadata.labels ?? {};
  for (const [key, value] of Object.entries(labels)) {
    if (key.startsWith('kube-vip.io/has-ip=')) return value;
    if (key === 'kube-vip.io/has-ip') return value;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Pod
// ---------------------------------------------------------------------------

export interface ContainerStatus {
  name: string;
  ready: boolean;
  restartCount: number;
  image?: string;
  state?: {
    running?: { startedAt?: string };
    waiting?: { reason?: string; message?: string };
    terminated?: { exitCode?: number; reason?: string };
  };
}

export interface PodStatus {
  phase?: string;
  conditions?: Array<{ type: string; status: string }>;
  containerStatuses?: ContainerStatus[];
  hostIP?: string;
  podIP?: string;
}

export interface PodSpec {
  nodeName?: string;
  hostNetwork?: boolean;
  containers?: Array<{
    name: string;
    image?: string;
    env?: Array<{ name: string; value?: string }>;
    args?: string[];
  }>;
}

export interface KubeVipPod extends KubeObject {
  spec?: PodSpec;
  status?: PodStatus;
}

/** Check if a pod is Ready. */
export function isPodReady(pod: KubeVipPod): boolean {
  return pod.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True') ?? false;
}

/** Get total restarts for a pod. */
export function getPodRestarts(pod: KubeVipPod): number {
  return pod.status?.containerStatuses?.reduce((sum, c) => sum + c.restartCount, 0) ?? 0;
}

/** Get the container image for a pod. */
export function getPodImage(pod: KubeVipPod): string {
  return pod.spec?.containers?.[0]?.image ?? pod.status?.containerStatuses?.[0]?.image ?? 'unknown';
}

/** Extract kube-vip configuration from pod environment variables. */
export function extractPodConfig(pod: KubeVipPod): Record<string, string> {
  const config: Record<string, string> = {};
  const env = pod.spec?.containers?.[0]?.env;
  if (!env) return config;
  for (const e of env) {
    if (e.value !== undefined) {
      config[e.name] = e.value;
    }
  }
  return config;
}

// ---------------------------------------------------------------------------
// DaemonSet
// ---------------------------------------------------------------------------

export interface DaemonSetStatus {
  currentNumberScheduled?: number;
  desiredNumberScheduled?: number;
  numberReady?: number;
  numberAvailable?: number;
  numberMisscheduled?: number;
  updatedNumberScheduled?: number;
}

export interface DaemonSetSpec {
  selector?: { matchLabels?: Record<string, string> };
  template?: {
    spec?: PodSpec;
  };
}

export interface KubeVipDaemonSet extends KubeObject {
  spec?: DaemonSetSpec;
  status?: DaemonSetStatus;
}

// ---------------------------------------------------------------------------
// Lease (leader election)
// ---------------------------------------------------------------------------

export interface LeaseSpec {
  holderIdentity?: string;
  leaseDurationSeconds?: number;
  acquireTime?: string;
  renewTime?: string;
  leaseTransitions?: number;
}

export interface KubeVipLease extends KubeObject {
  spec?: LeaseSpec;
}

// ---------------------------------------------------------------------------
// ConfigMap (IP pool configuration for kube-vip-cloud-provider)
// ---------------------------------------------------------------------------

export interface KubeVipConfigMap extends KubeObject {
  data?: Record<string, string>;
}

/** Parse IP pool ranges from the kubevip ConfigMap data. */
export function parseIPPools(data: Record<string, string> | undefined): IPPool[] {
  if (!data) return [];
  const pools: IPPool[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('range-') || key.startsWith('cidr-')) {
      pools.push({
        name: key,
        type: key.startsWith('range-') ? 'range' : 'cidr',
        value,
        scope: 'global',
      });
    } else if (key.includes('/')) {
      // Namespace-specific pool: "namespace/range-name" or "namespace/cidr-name"
      const [ns, poolName] = key.split('/', 2);
      const type = poolName.startsWith('range-')
        ? 'range'
        : poolName.startsWith('cidr-')
        ? 'cidr'
        : 'unknown';
      pools.push({
        name: poolName,
        type,
        value,
        scope: 'namespace',
        namespace: ns,
      });
    }
  }
  return pools;
}

export interface IPPool {
  name: string;
  type: 'range' | 'cidr' | 'unknown';
  value: string;
  scope: 'global' | 'namespace';
  namespace?: string;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function formatAge(timestamp: string | undefined): string {
  if (!timestamp) return 'unknown';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function phaseToStatus(phase: string | undefined): 'success' | 'warning' | 'error' {
  switch (phase) {
    case 'Running':
    case 'Active':
    case 'Ready':
    case 'Bound':
      return 'success';
    case 'Pending':
    case 'Terminating':
      return 'warning';
    default:
      return 'error';
  }
}
