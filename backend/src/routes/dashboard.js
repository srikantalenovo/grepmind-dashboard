import express from 'express';
import { getK8sApis } from '../config/kubernetes.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Get comprehensive dashboard data
router.get('/overview', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    logger.info('🎯 Fetching live dashboard data from Kubernetes cluster...');
    
    const { k8sApi, k8sAppsApi, k8sNetworkingApi, k8sBatchApi } = getK8sApis();
    
    // Fetch data from multiple namespaces for comprehensive overview
    const [
      nodesResponse,
      namespacesResponse,
      allPodsResponse,
      allServicesResponse,
      allDeploymentsResponse,
      allStatefulSetsResponse,
      allDaemonSetsResponse,
      allJobsResponse,
      allCronJobsResponse,
      allConfigMapsResponse,
      allSecretsResponse,
      allIngressResponse
    ] = await Promise.allSettled([
      k8sApi.listNode(),
      k8sApi.listNamespace(),
      k8sApi.listPodForAllNamespaces(),
      k8sApi.listServiceForAllNamespaces(),
      k8sAppsApi.listDeploymentForAllNamespaces(),
      k8sAppsApi.listStatefulSetForAllNamespaces(),
      k8sAppsApi.listDaemonSetForAllNamespaces(),
      k8sBatchApi.listJobForAllNamespaces(),
      k8sBatchApi.listCronJobForAllNamespaces(),
      k8sApi.listConfigMapForAllNamespaces(),
      k8sApi.listSecretForAllNamespaces(),
      k8sNetworkingApi.listIngressForAllNamespaces()
    ]);

    // Process nodes data
    const nodes = nodesResponse.status === 'fulfilled' ? nodesResponse.value.body.items : [];
    const nodesStats = {
      total: nodes.length,
      ready: nodes.filter(node => 
        node.status.conditions?.find(c => c.type === 'Ready')?.status === 'True'
      ).length,
      notReady: nodes.filter(node => 
        node.status.conditions?.find(c => c.type === 'Ready')?.status !== 'True'
      ).length
    };

    // Process pods data
    const pods = allPodsResponse.status === 'fulfilled' ? allPodsResponse.value.body.items : [];
    const podsStats = {
      total: pods.length,
      running: pods.filter(pod => pod.status.phase === 'Running').length,
      pending: pods.filter(pod => pod.status.phase === 'Pending').length,
      failed: pods.filter(pod => pod.status.phase === 'Failed').length,
      succeeded: pods.filter(pod => pod.status.phase === 'Succeeded').length
    };

    // Process services data
    const services = allServicesResponse.status === 'fulfilled' ? allServicesResponse.value.body.items : [];
    const servicesStats = {
      total: services.length,
      active: services.length, // All listed services are considered active
      clusterIP: services.filter(svc => svc.spec.type === 'ClusterIP').length,
      nodePort: services.filter(svc => svc.spec.type === 'NodePort').length,
      loadBalancer: services.filter(svc => svc.spec.type === 'LoadBalancer').length
    };

    // Process deployments data
    const deployments = allDeploymentsResponse.status === 'fulfilled' ? allDeploymentsResponse.value.body.items : [];
    const deploymentsStats = {
      total: deployments.length,
      ready: deployments.filter(dep => dep.status.readyReplicas === dep.status.replicas).length,
      updating: deployments.filter(dep => dep.status.updatedReplicas !== dep.status.replicas).length,
      available: deployments.filter(dep => dep.status.availableReplicas > 0).length
    };

    // Process other workloads
    const statefulSets = allStatefulSetsResponse.status === 'fulfilled' ? allStatefulSetsResponse.value.body.items : [];
    const daemonSets = allDaemonSetsResponse.status === 'fulfilled' ? allDaemonSetsResponse.value.body.items : [];
    const jobs = allJobsResponse.status === 'fulfilled' ? allJobsResponse.value.body.items : [];
    const cronJobs = allCronJobsResponse.status === 'fulfilled' ? allCronJobsResponse.value.body.items : [];
    const configMaps = allConfigMapsResponse.status === 'fulfilled' ? allConfigMapsResponse.value.body.items : [];
    const secrets = allSecretsResponse.status === 'fulfilled' ? allSecretsResponse.value.body.items : [];
    const ingresses = allIngressResponse.status === 'fulfilled' ? allIngressResponse.value.body.items : [];

    // Generate recent activity from actual cluster events (last 10 items)
    const recentActivity = [];
    
    // Add recent pod creations/changes
    const recentPods = pods
      .sort((a, b) => new Date(b.metadata.creationTimestamp) - new Date(a.metadata.creationTimestamp))
      .slice(0, 3);
    
    recentPods.forEach(pod => {
      const timeDiff = Date.now() - new Date(pod.metadata.creationTimestamp);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      recentActivity.push({
        action: 'created',
        resource: `pod/${pod.metadata.name}`,
        namespace: pod.metadata.namespace,
        time: minutesAgo < 60 ? `${minutesAgo} minutes ago` : `${Math.floor(minutesAgo / 60)} hours ago`,
        user: 'System'
      });
    });

    // Add recent deployment changes
    const recentDeployments = deployments
      .sort((a, b) => new Date(b.metadata.creationTimestamp) - new Date(a.metadata.creationTimestamp))
      .slice(0, 2);
    
    recentDeployments.forEach(deployment => {
      const timeDiff = Date.now() - new Date(deployment.metadata.creationTimestamp);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      recentActivity.push({
        action: deployment.status.updatedReplicas !== deployment.status.replicas ? 'updated' : 'created',
        resource: `deployment/${deployment.metadata.name}`,
        namespace: deployment.metadata.namespace,
        time: minutesAgo < 60 ? `${minutesAgo} minutes ago` : `${Math.floor(minutesAgo / 60)} hours ago`,
        user: 'System'
      });
    });

    // Cluster health status
    const clusterHealth = {
      status: nodesStats.ready === nodesStats.total && podsStats.failed === 0 ? 'healthy' : 'warning',
      uptime: process.uptime(),
      lastUpdated: new Date().toISOString()
    };

    const dashboardData = {
      cluster: clusterHealth,
      nodes: nodesStats,
      pods: podsStats,
      services: servicesStats,
      deployments: deploymentsStats,
      workloads: {
        statefulSets: statefulSets.length,
        daemonSets: daemonSets.length,
        jobs: jobs.length,
        cronJobs: cronJobs.length
      },
      storage: {
        configMaps: configMaps.length,
        secrets: secrets.length,
        persistentVolumes: 0 // Could be added later
      },
      networking: {
        ingresses: ingresses.length,
        services: servicesStats.total
      },
      namespaces: namespacesResponse.status === 'fulfilled' ? namespacesResponse.value.body.items.length : 0,
      recentActivity: recentActivity.slice(0, 5), // Limit to 5 most recent
      resourceCounts: {
        totalResources: pods.length + services.length + deployments.length + statefulSets.length + daemonSets.length,
        totalWorkloads: deployments.length + statefulSets.length + daemonSets.length + jobs.length + cronJobs.length
      }
    };

    logger.info('✅ Successfully fetched live dashboard data', {
      nodes: nodesStats.total,
      pods: podsStats.total,
      services: servicesStats.total,
      deployments: deploymentsStats.total,
      activityItems: recentActivity.length
    });

    res.json({ 
      success: true, 
      data: dashboardData,
      timestamp: new Date().toISOString(),
      source: 'live-cluster'
    });

  } catch (error) {
    logger.error('❌ Failed to fetch dashboard data:', {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    });

    // Return error with some basic info
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data from cluster',
      details: error.message,
      fallback: {
        cluster: { status: 'unknown', uptime: process.uptime() },
        nodes: { total: 0, ready: 0, notReady: 0 },
        pods: { total: 0, running: 0, pending: 0, failed: 0 },
        services: { total: 0, active: 0 },
        deployments: { total: 0, ready: 0, updating: 0 },
        recentActivity: []
      }
    });
  }
});

// Get cluster info
router.get('/cluster-info', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { k8sApi } = getK8sApis();
    
    // Get cluster version info
    const versionInfo = await k8sApi.getAPIResources();
    
    // Get node details
    const nodesResponse = await k8sApi.listNode();
    const nodes = nodesResponse.body.items;

    const clusterInfo = {
      version: 'v1.31.13', // Your cluster version
      nodeCount: nodes.length,
      nodes: nodes.map(node => ({
        name: node.metadata.name,
        status: node.status.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
        version: node.status.nodeInfo?.kubeletVersion,
        os: node.status.nodeInfo?.osImage,
        architecture: node.status.nodeInfo?.architecture,
        containerRuntime: node.status.nodeInfo?.containerRuntimeVersion
      })),
      apiResources: versionInfo.body.resources?.length || 0
    };

    res.json({ 
      success: true, 
      data: clusterInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch cluster info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch cluster information',
      details: error.message
    });
  }
});

export default router;
