import { getKubernetesClient, handleK8sError } from '../config/kubernetes.js';
import { logger } from '../utils/logger.js';

// Get cluster overview/summary
export const getClusterOverview = async () => {
  try {
    const { coreApi, appsApi } = getKubernetesClient();
    
    // Get basic cluster info
    const [
      namespacesResponse,
      nodesResponse,
      podsResponse,
      deploymentsResponse,
      servicesResponse
    ] = await Promise.allSettled([
      coreApi.listNamespace(),
      coreApi.listNode(),
      coreApi.listPodForAllNamespaces(),
      appsApi.listDeploymentForAllNamespaces(),
      coreApi.listServiceForAllNamespaces()
    ]);
    
    const overview = {
      namespaces: {
        total: 0,
        active: 0
      },
      nodes: {
        total: 0,
        ready: 0,
        notReady: 0
      },
      pods: {
        total: 0,
        running: 0,
        pending: 0,
        failed: 0,
        succeeded: 0
      },
      deployments: {
        total: 0,
        ready: 0,
        updating: 0
      },
      services: {
        total: 0,
        clusterIP: 0,
        nodePort: 0,
        loadBalancer: 0
      }
    };
    
    // Process namespaces
    if (namespacesResponse.status === 'fulfilled') {
      const namespaces = namespacesResponse.value.body.items;
      overview.namespaces.total = namespaces.length;
      overview.namespaces.active = namespaces.filter(ns => ns.status.phase === 'Active').length;
    }
    
    // Process nodes
    if (nodesResponse.status === 'fulfilled') {
      const nodes = nodesResponse.value.body.items;
      overview.nodes.total = nodes.length;
      
      nodes.forEach(node => {
        const readyCondition = node.status.conditions?.find(c => c.type === 'Ready');
        if (readyCondition?.status === 'True') {
          overview.nodes.ready++;
        } else {
          overview.nodes.notReady++;
        }
      });
    }
    
    // Process pods
    if (podsResponse.status === 'fulfilled') {
      const pods = podsResponse.value.body.items;
      overview.pods.total = pods.length;
      
      pods.forEach(pod => {
        switch (pod.status.phase) {
          case 'Running':
            overview.pods.running++;
            break;
          case 'Pending':
            overview.pods.pending++;
            break;
          case 'Failed':
            overview.pods.failed++;
            break;
          case 'Succeeded':
            overview.pods.succeeded++;
            break;
        }
      });
    }
    
    // Process deployments
    if (deploymentsResponse.status === 'fulfilled') {
      const deployments = deploymentsResponse.value.body.items;
      overview.deployments.total = deployments.length;
      
      deployments.forEach(deployment => {
        if (deployment.status.readyReplicas === deployment.spec.replicas) {
          overview.deployments.ready++;
        } else {
          overview.deployments.updating++;
        }
      });
    }
    
    // Process services
    if (servicesResponse.status === 'fulfilled') {
      const services = servicesResponse.value.body.items;
      overview.services.total = services.length;
      
      services.forEach(service => {
        switch (service.spec.type) {
          case 'ClusterIP':
            overview.services.clusterIP++;
            break;
          case 'NodePort':
            overview.services.nodePort++;
            break;
          case 'LoadBalancer':
            overview.services.loadBalancer++;
            break;
        }
      });
    }
    
    return {
      success: true,
      data: overview
    };
    
  } catch (error) {
    const k8sError = handleK8sError(error, 'Get cluster overview');
    return {
      success: false,
      error: k8sError.message
    };
  }
};

// Get resource events
export const getResourceEvents = async (namespace, resourceType, resourceName) => {
  try {
    const { coreApi } = getKubernetesClient();
    
    const fieldSelector = resourceName 
      ? `involvedObject.name=${resourceName}`
      : `involvedObject.namespace=${namespace}`;
    
    const response = await coreApi.listNamespacedEvent(
      namespace,
      undefined, // pretty
      undefined, // allowWatchBookmarks
      undefined, // continue
      fieldSelector
    );
    
    const events = response.body.items
      .sort((a, b) => new Date(b.lastTimestamp || b.eventTime) - new Date(a.lastTimestamp || a.eventTime))
      .map(event => ({
        type: event.type,
        reason: event.reason,
        message: event.message,
        firstTimestamp: event.firstTimestamp,
        lastTimestamp: event.lastTimestamp,
        count: event.count || 1,
        source: event.source?.component || event.reportingComponent,
        object: {
          kind: event.involvedObject.kind,
          name: event.involvedObject.name,
          namespace: event.involvedObject.namespace
        }
      }));
    
    return {
      success: true,
      data: events
    };
    
  } catch (error) {
    const k8sError = handleK8sError(error, 'Get resource events');
    return {
      success: false,
      error: k8sError.message
    };
  }
};

// Get pod metrics (if metrics server is available)
export const getPodMetrics = async (namespace, podName = null) => {
  try {
    const { metricsApi } = getKubernetesClient();
    
    if (!metricsApi) {
      return {
        success: false,
        error: 'Metrics API not available'
      };
    }
    
    let response;
    if (podName) {
      response = await metricsApi.getNamespacedPodMetrics(podName, namespace);
    } else {
      response = await metricsApi.listNamespacedPodMetrics(namespace);
    }
    
    const metrics = Array.isArray(response.body.items) 
      ? response.body.items 
      : [response.body];
    
    const processedMetrics = metrics.map(metric => ({
      name: metric.metadata.name,
      namespace: metric.metadata.namespace,
      timestamp: metric.timestamp,
      containers: metric.containers.map(container => ({
        name: container.name,
        usage: {
          cpu: container.usage.cpu,
          memory: container.usage.memory
        }
      }))
    }));
    
    return {
      success: true,
      data: processedMetrics
    };
    
  } catch (error) {
    const k8sError = handleK8sError(error, 'Get pod metrics');
    return {
      success: false,
      error: k8sError.message
    };
  }
};

// Get node metrics (if metrics server is available)
export const getNodeMetrics = async (nodeName = null) => {
  try {
    const { metricsApi } = getKubernetesClient();
    
    if (!metricsApi) {
      return {
        success: false,
        error: 'Metrics API not available'
      };
    }
    
    let response;
    if (nodeName) {
      response = await metricsApi.getNodeMetrics(nodeName);
    } else {
      response = await metricsApi.listNodeMetrics();
    }
    
    const metrics = Array.isArray(response.body.items) 
      ? response.body.items 
      : [response.body];
    
    const processedMetrics = metrics.map(metric => ({
      name: metric.metadata.name,
      timestamp: metric.timestamp,
      usage: {
        cpu: metric.usage.cpu,
        memory: metric.usage.memory
      }
    }));
    
    return {
      success: true,
      data: processedMetrics
    };
    
  } catch (error) {
    const k8sError = handleK8sError(error, 'Get node metrics');
    return {
      success: false,
      error: k8sError.message
    };
  }
};

// Scale deployment
export const scaleDeployment = async (namespace, deploymentName, replicas) => {
  try {
    const { appsApi } = getKubernetesClient();
    
    // Get current deployment
    const currentDeployment = await appsApi.readNamespacedDeployment(deploymentName, namespace);
    
    // Create patch for scaling
    const patch = {
      spec: {
        replicas: parseInt(replicas)
      }
    };
    
    const response = await appsApi.patchNamespacedDeployment(
      deploymentName,
      namespace,
      patch,
      undefined, // pretty
      undefined, // dryRun
      undefined, // fieldManager
      undefined, // force
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );
    
    return {
      success: true,
      data: {
        name: response.body.metadata.name,
        namespace: response.body.metadata.namespace,
        previousReplicas: currentDeployment.body.spec.replicas,
        newReplicas: response.body.spec.replicas
      }
    };
    
  } catch (error) {
    const k8sError = handleK8sError(error, 'Scale deployment');
    return {
      success: false,
      error: k8sError.message
    };
  }
};

// Restart deployment (by updating annotation)
export const restartDeployment = async (namespace, deploymentName) => {
  try {
    const { appsApi } = getKubernetesClient();
    
    const patch = {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString()
            }
          }
        }
      }
    };
    
    const response = await appsApi.patchNamespacedDeployment(
      deploymentName,
      namespace,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );
    
    return {
      success: true,
      data: {
        name: response.body.metadata.name,
        namespace: response.body.metadata.namespace,
        restartedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    const k8sError = handleK8sError(error, 'Restart deployment');
    return {
      success: false,
      error: k8sError.message
    };
  }
};

// Get resource usage statistics
export const getResourceUsageStats = async () => {
  try {
    const clusterOverview = await getClusterOverview();
    
    if (!clusterOverview.success) {
      return clusterOverview;
    }
    
    // Try to get metrics if available
    const nodeMetrics = await getNodeMetrics();
    const podMetrics = await getPodMetrics('default'); // Sample namespace
    
    const stats = {
      cluster: clusterOverview.data,
      metrics: {
        nodesAvailable: nodeMetrics.success,
        podsAvailable: podMetrics.success,
        nodes: nodeMetrics.success ? nodeMetrics.data : [],
        pods: podMetrics.success ? podMetrics.data : []
      }
    };
    
    return {
      success: true,
      data: stats
    };
    
  } catch (error) {
    const k8sError = handleK8sError(error, 'Get resource usage stats');
    return {
      success: false,
      error: k8sError.message
    };
  }
};