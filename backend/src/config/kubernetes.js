import * as k8s from '@kubernetes/client-node';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

let kubeConfig = null;
let k8sApi = null;
let k8sAppsV1Api = null;
let k8sMetricsApi = null;
let k8sCoreV1Api = null;
let isKubernetesAvailable = false;

// Kubernetes API client initialization
export async function initializeKubernetes() {
  try {
    kubeConfig = new k8s.KubeConfig();
    
    // Try different methods to load kubeconfig
    if (process.env.KUBECONFIG_PATH && fs.existsSync(process.env.KUBECONFIG_PATH)) {
      // Load from specified path
      kubeConfig.loadFromFile(process.env.KUBECONFIG_PATH);
      logger.info('📁 Loaded kubeconfig from file:', process.env.KUBECONFIG_PATH);
    } else if (fs.existsSync(path.join(process.env.HOME || '/root', '.kube', 'config'))) {
      // Load from default location
      kubeConfig.loadFromDefault();
      logger.info('🏠 Loaded kubeconfig from default location');
    } else {
      // Load from cluster (when running inside a pod)
      kubeConfig.loadFromCluster();
      logger.info('🏢 Loaded kubeconfig from cluster');
    }
    
    // Initialize API clients
    k8sCoreV1Api = kubeConfig.makeApiClient(k8s.CoreV1Api);
    k8sAppsV1Api = kubeConfig.makeApiClient(k8s.AppsV1Api);
    k8sApi = k8sCoreV1Api; // Alias for backward compatibility
    
    // Test the connection
    const response = await k8sCoreV1Api.listNamespace();
    logger.info(`✅ Kubernetes API connected successfully. Found ${response.body.items.length} namespaces`);
    
    isKubernetesAvailable = true;
    return { k8sApi, k8sCoreV1Api, k8sAppsV1Api, kubeConfig };
  } catch (error) {
    logger.error('❌ Failed to initialize Kubernetes client:', error.message);
    isKubernetesAvailable = false;
    throw error;
  }
}

// Kubernetes service class
export class KubernetesService {
  static isAvailable() {
    return isKubernetesAvailable;
  }
  
  // Namespace operations
  static async getNamespaces() {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      const response = await k8sCoreV1Api.listNamespace();
      return response.body.items.map(ns => ({
        name: ns.metadata.name,
        status: ns.status.phase,
        creationTimestamp: ns.metadata.creationTimestamp,
        labels: ns.metadata.labels || {},
        annotations: ns.metadata.annotations || {}
      }));
    } catch (error) {
      logger.error('Failed to fetch namespaces:', error);
      throw error;
    }
  }
  
  // Pod operations
  static async getPods(namespace = null) {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      let response;
      if (namespace) {
        response = await k8sCoreV1Api.listNamespacedPod(namespace);
      } else {
        response = await k8sCoreV1Api.listPodForAllNamespaces();
      }
      
      return response.body.items.map(pod => ({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status.phase,
        ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
        restartCount: pod.status.containerStatuses?.[0]?.restartCount || 0,
        node: pod.spec.nodeName,
        creationTimestamp: pod.metadata.creationTimestamp,
        labels: pod.metadata.labels || {},
        annotations: pod.metadata.annotations || {},
        containers: pod.spec.containers.map(c => ({
          name: c.name,
          image: c.image,
          resources: c.resources || {}
        }))
      }));
    } catch (error) {
      logger.error('Failed to fetch pods:', error);
      throw error;
    }
  }
  
  // Deployment operations
  static async getDeployments(namespace = null) {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      let response;
      if (namespace) {
        response = await k8sAppsV1Api.listNamespacedDeployment(namespace);
      } else {
        response = await k8sAppsV1Api.listDeploymentForAllNamespaces();
      }
      
      return response.body.items.map(deployment => ({
        name: deployment.metadata.name,
        namespace: deployment.metadata.namespace,
        replicas: deployment.spec.replicas,
        readyReplicas: deployment.status.readyReplicas || 0,
        unavailableReplicas: deployment.status.unavailableReplicas || 0,
        strategy: deployment.spec.strategy?.type || 'RollingUpdate',
        creationTimestamp: deployment.metadata.creationTimestamp,
        labels: deployment.metadata.labels || {},
        annotations: deployment.metadata.annotations || {}
      }));
    } catch (error) {
      logger.error('Failed to fetch deployments:', error);
      throw error;
    }
  }
  
  // Service operations
  static async getServices(namespace = null) {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      let response;
      if (namespace) {
        response = await k8sCoreV1Api.listNamespacedService(namespace);
      } else {
        response = await k8sCoreV1Api.listServiceForAllNamespaces();
      }
      
      return response.body.items.map(service => ({
        name: service.metadata.name,
        namespace: service.metadata.namespace,
        type: service.spec.type,
        clusterIP: service.spec.clusterIP,
        externalIP: service.status.loadBalancer?.ingress?.[0]?.ip,
        ports: service.spec.ports || [],
        selector: service.spec.selector || {},
        creationTimestamp: service.metadata.creationTimestamp,
        labels: service.metadata.labels || {},
        annotations: service.metadata.annotations || {}
      }));
    } catch (error) {
      logger.error('Failed to fetch services:', error);
      throw error;
    }
  }
  
  // Node operations
  static async getNodes() {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      const response = await k8sCoreV1Api.listNode();
      return response.body.items.map(node => ({
        name: node.metadata.name,
        status: node.status.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
        version: node.status.nodeInfo?.kubeletVersion,
        internalIP: node.status.addresses?.find(a => a.type === 'InternalIP')?.address,
        externalIP: node.status.addresses?.find(a => a.type === 'ExternalIP')?.address,
        allocatableCpu: node.status.allocatable?.cpu,
        allocatableMemory: node.status.allocatable?.memory,
        capacityCpu: node.status.capacity?.cpu,
        capacityMemory: node.status.capacity?.memory,
        creationTimestamp: node.metadata.creationTimestamp,
        labels: node.metadata.labels || {},
        annotations: node.metadata.annotations || {}
      }));
    } catch (error) {
      logger.error('Failed to fetch nodes:', error);
      throw error;
    }
  }
  
  // Events operations
  static async getEvents(namespace = null, limit = 100) {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      let response;
      if (namespace) {
        response = await k8sCoreV1Api.listNamespacedEvent(namespace, undefined, undefined, undefined, undefined, limit);
      } else {
        response = await k8sCoreV1Api.listEventForAllNamespaces(undefined, undefined, undefined, undefined, limit);
      }
      
      return response.body.items.map(event => ({
        name: event.metadata.name,
        namespace: event.metadata.namespace,
        reason: event.reason,
        message: event.message,
        type: event.type,
        count: event.count || 1,
        firstTimestamp: event.firstTimestamp,
        lastTimestamp: event.lastTimestamp,
        involvedObject: {
          kind: event.involvedObject.kind,
          name: event.involvedObject.name,
          namespace: event.involvedObject.namespace
        }
      }));
    } catch (error) {
      logger.error('Failed to fetch events:', error);
      throw error;
    }
  }
  
  // Resource scaling
  static async scaleDeployment(namespace, deploymentName, replicas) {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      const patch = {
        spec: {
          replicas: parseInt(replicas)
        }
      };
      
      const response = await k8sAppsV1Api.patchNamespacedDeployment(
        deploymentName,
        namespace,
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      );
      
      return {
        name: response.body.metadata.name,
        namespace: response.body.metadata.namespace,
        replicas: response.body.spec.replicas
      };
    } catch (error) {
      logger.error('Failed to scale deployment:', error);
      throw error;
    }
  }
  
  // Get cluster info
  static async getClusterInfo() {
    if (!isKubernetesAvailable) throw new Error('Kubernetes not available');
    
    try {
      const [namespaces, nodes, pods] = await Promise.all([
        this.getNamespaces(),
        this.getNodes(),
        this.getPods()
      ]);
      
      return {
        totalNamespaces: namespaces.length,
        totalNodes: nodes.length,
        totalPods: pods.length,
        readyNodes: nodes.filter(n => n.status === 'Ready').length,
        runningPods: pods.filter(p => p.status === 'Running').length,
        clusterVersion: nodes[0]?.version || 'Unknown'
      };
    } catch (error) {
      logger.error('Failed to get cluster info:', error);
      throw error;
    }
  }
}

export { k8sApi, k8sCoreV1Api, k8sAppsV1Api, kubeConfig, isKubernetesAvailable };