import k8s from '@kubernetes/client-node';
import { logger } from '../utils/logger.js';

// API clients
let k8sApi = null;           // Core (Pods, Services, ConfigMaps, etc.)
let k8sAppsApi = null;       // Apps (Deployments, StatefulSets, DaemonSets)
let k8sNetworkingApi = null; // Ingress, NetworkPolicy
let k8sBatchApi = null;      // Jobs + CronJobs (>= v1.21)
let k8sCustomApi = null;     // CRDs (CustomResourceDefinitions)

export const initializeKubernetes = async () => {
  try {
    logger.info('🚀 Starting Kubernetes API initialization...');
    
    // Log import status for debugging
    logger.info('🔍 Checking k8s client module:', {
      k8sModule: typeof k8s,
      KubeConfig: typeof k8s.KubeConfig,
      CoreV1Api: typeof k8s.CoreV1Api,
      AppsV1Api: typeof k8s.AppsV1Api,
      NetworkingV1Api: typeof k8s.NetworkingV1Api,
      BatchV1Api: typeof k8s.BatchV1Api,
      CustomObjectsApi: typeof k8s.CustomObjectsApi
    });

    const kc = new k8s.KubeConfig();
    logger.info('✅ KubeConfig instance created successfully');
    
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
    
    // Log cluster info
    logger.info('🌐 Cluster info:', {
      currentContext: kc.getCurrentContext(),
      clusters: kc.getClusters().map(c => ({ name: c.name, server: c.server })),
      users: kc.getUsers().map(u => ({ name: u.name }))
    });

    // Initialize API clients
    logger.info('🔧 Creating API clients...');
    
    k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    logger.info('✅ CoreV1Api client created');
    
    k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
    logger.info('✅ AppsV1Api client created');
    
    k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
    logger.info('✅ NetworkingV1Api client created');
    
    k8sBatchApi = kc.makeApiClient(k8s.BatchV1Api);  // ✅ replaces BatchV1beta1Api
    logger.info('✅ BatchV1Api client created');
    
    k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi);
    logger.info('✅ CustomObjectsApi client created');

    // Test connection with a simple API call
    logger.info('📞 Testing API connection...');
    const versionResponse = await k8sApi.getAPIResources();
    logger.info('✅ Kubernetes API connection established successfully');
    logger.info('📊 API Resources available:', versionResponse.body.resources?.length || 0);
    logger.info('✅ Available API clients: Core, Apps, Networking, Batch, CustomObjects');
    
    return { k8sApi, k8sAppsApi, k8sNetworkingApi, k8sBatchApi, k8sCustomApi };
  } catch (error) {
    logger.error('❌ Failed to initialize Kubernetes API');
    logger.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Additional diagnostics
    logger.error('🔍 Environment info:', {
      nodeVersion: process.version,
      kubernetesInCluster: process.env.KUBERNETES_IN_CLUSTER,
      kubeconfig: process.env.KUBECONFIG,
      serviceAccount: !!process.env.KUBERNETES_SERVICE_HOST
    });
    
    throw error;
  }
};

export const getK8sApis = () => {
  if (!k8sApi || !k8sAppsApi || !k8sNetworkingApi || !k8sBatchApi || !k8sCustomApi) {
    throw new Error('Kubernetes APIs not initialized. Call initializeKubernetes() first.');
  }
  return { k8sApi, k8sAppsApi, k8sNetworkingApi, k8sBatchApi, k8sCustomApi };
};

// Export initialized clients
export {
  k8sApi,
  k8sAppsApi,
  k8sNetworkingApi,
  k8sBatchApi,
  k8sCustomApi
};

