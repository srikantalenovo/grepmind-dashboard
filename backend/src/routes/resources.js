import express from 'express';
import { getK8sApis } from '../config/kubernetes.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import yaml from 'yaml';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Get all namespaces
router.get('/namespaces', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { k8sApi } = getK8sApis();
    const response = await k8sApi.listNamespace();
    
    const namespaces = response.body.items.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      creationTimestamp: ns.metadata.creationTimestamp,
      labels: ns.metadata.labels || {},
      annotations: ns.metadata.annotations || {}
    }));
    
    res.json({ success: true, data: namespaces });
  } catch (error) {
    logger.error('Failed to fetch namespaces:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch namespaces' });
  }
});

// Get pods in a namespace
router.get('/pods', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sApi } = getK8sApis();
    
    const response = await k8sApi.listNamespacedPod(namespace);
    
    const pods = response.body.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      restarts: pod.status.containerStatuses?.reduce((acc, container) => acc + container.restartCount, 0) || 0,
      age: pod.metadata.creationTimestamp,
      ready: `${pod.status.containerStatuses?.filter(c => c.ready).length || 0}/${pod.status.containerStatuses?.length || 0}`,
      ip: pod.status.podIP,
      node: pod.spec.nodeName,
      labels: pod.metadata.labels || {},
      annotations: pod.metadata.annotations || {}
    }));
    
    res.json({ success: true, data: pods });
  } catch (error) {
    logger.error('Failed to fetch pods:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pods' });
  }
});

// Get services in a namespace
router.get('/services', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sApi } = getK8sApis();
    
    const response = await k8sApi.listNamespacedService(namespace);
    
    const services = response.body.items.map(service => ({
      name: service.metadata.name,
      namespace: service.metadata.namespace,
      type: service.spec.type,
      clusterIP: service.spec.clusterIP,
      externalIP: service.status.loadBalancer?.ingress?.[0]?.ip || 'None',
      ports: service.spec.ports?.map(port => `${port.port}/${port.protocol}`) || [],
      age: service.metadata.creationTimestamp,
      selector: service.spec.selector || {}
    }));
    
    res.json({ success: true, data: services });
  } catch (error) {
    logger.error('Failed to fetch services:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

// Get deployments in a namespace
router.get('/deployments', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sAppsApi } = getK8sApis();
    
    const response = await k8sAppsApi.listNamespacedDeployment(namespace);
    
    const deployments = response.body.items.map(deployment => ({
      name: deployment.metadata.name,
      namespace: deployment.metadata.namespace,
      ready: `${deployment.status.readyReplicas || 0}/${deployment.spec.replicas || 0}`,
      upToDate: deployment.status.updatedReplicas || 0,
      available: deployment.status.availableReplicas || 0,
      age: deployment.metadata.creationTimestamp,
      strategy: deployment.spec.strategy?.type || 'RollingUpdate'
    }));
    
    res.json({ success: true, data: deployments });
  } catch (error) {
    logger.error('Failed to fetch deployments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deployments' });
  }
});

// Get pod logs
router.get('/pods/:name/logs', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', container, lines = 100 } = req.query;
    const { k8sApi } = getK8sApis();
    
    const logOptions = {
      follow: false,
      tailLines: parseInt(lines),
      timestamps: true
    };
    
    if (container) {
      logOptions.container = container;
    }
    
    const response = await k8sApi.readNamespacedPodLog(
      name,
      namespace,
      undefined, // container
      undefined, // follow
      undefined, // limitBytes
      undefined, // pretty
      undefined, // previous
      undefined, // sinceSeconds
      parseInt(lines), // tailLines
      true // timestamps
    );
    
    res.json({ success: true, data: { logs: response.body } });
  } catch (error) {
    logger.error('Failed to fetch pod logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pod logs' });
  }
});

// Get resource details (YAML)
router.get('/:resourceType/:name', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { resourceType, name } = req.params;
    const { namespace = 'default' } = req.query;
    const { k8sApi, k8sAppsApi, k8sNetworkingApi } = getK8sApis();
    
    let response;
    
    switch (resourceType.toLowerCase()) {
      case 'pod':
        response = await k8sApi.readNamespacedPod(name, namespace);
        break;
      case 'service':
        response = await k8sApi.readNamespacedService(name, namespace);
        break;
      case 'deployment':
        response = await k8sAppsApi.readNamespacedDeployment(name, namespace);
        break;
      case 'configmap':
        response = await k8sApi.readNamespacedConfigMap(name, namespace);
        break;
      case 'secret':
        response = await k8sApi.readNamespacedSecret(name, namespace);
        // Mask secret values
        if (response.body.data) {
          Object.keys(response.body.data).forEach(key => {
            response.body.data[key] = '***MASKED***';
          });
        }
        break;
      default:
        return res.status(400).json({ success: false, error: 'Unsupported resource type' });
    }
    
    const resourceYaml = yaml.stringify(response.body);
    
    res.json({
      success: true,
      data: {
        resource: response.body,
        yaml: resourceYaml
      }
    });
  } catch (error) {
    logger.error('Failed to fetch resource details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch resource details' });
  }
});

export default router;