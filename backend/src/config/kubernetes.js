import k8s from '@kubernetes/client-node';
const { Client, KubeConfig } = k8s;
import { logger } from '../utils/logger.js';

let k8sApi = null;
let k8sAppsApi = null;
let k8sNetworkingApi = null;
let k8sMetricsApi = null;

export const initializeKubernetes = async () => {
  try {
    const kc = new KubeConfig();
    
    // Load kubernetes config
    if (process.env.KUBERNETES_IN_CLUSTER === 'true') {
      // Running inside a Kubernetes cluster
      kc.loadFromCluster();
      logger.info('✅ Loaded Kubernetes config from cluster');
    } else {
      // Running outside cluster (development)
      kc.loadFromDefault();
      logger.info('✅ Loaded Kubernetes config from default location');
    }
    
    // Create API clients 
    k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
    k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

    // Test connection
    const versionResponse = await k8sApi.getAPIResources();
    logger.info('✅ Kubernetes API connection established');
    
    return { k8sApi, k8sAppsApi, k8sNetworkingApi };
  } catch (error) {
    logger.error('❌ Failed to initialize Kubernetes API:', error.message);
    throw error;
  }
};

export const getK8sApis = () => {
  if (!k8sApi || !k8sAppsApi || !k8sNetworkingApi) {
    throw new Error('Kubernetes APIs not initialized. Call initializeKubernetes() first.');
  }
  return { k8sApi, k8sAppsApi, k8sNetworkingApi };
};

export { k8sApi, k8sAppsApi, k8sNetworkingApi };
