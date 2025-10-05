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

// Get configmaps in a namespace
router.get('/configmaps', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sApi } = getK8sApis();
    
    const response = await k8sApi.listNamespacedConfigMap(namespace);
    
    const configmaps = response.body.items.map(cm => ({
      name: cm.metadata.name,
      namespace: cm.metadata.namespace,
      dataCount: Object.keys(cm.data || {}).length,
      age: cm.metadata.creationTimestamp,
      labels: cm.metadata.labels || {},
      annotations: cm.metadata.annotations || {}
    }));
    
    res.json({ success: true, data: configmaps });
  } catch (error) {
    logger.error('Failed to fetch configmaps:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch configmaps' });
  }
});

// Get secrets in a namespace
router.get('/secrets', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sApi } = getK8sApis();
    
    const response = await k8sApi.listNamespacedSecret(namespace);
    
    const secrets = response.body.items.map(secret => ({
      name: secret.metadata.name,
      namespace: secret.metadata.namespace,
      type: secret.type,
      dataCount: Object.keys(secret.data || {}).length,
      age: secret.metadata.creationTimestamp,
      labels: secret.metadata.labels || {},
      annotations: secret.metadata.annotations || {}
    }));
    
    res.json({ success: true, data: secrets });
  } catch (error) {
    logger.error('Failed to fetch secrets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch secrets' });
  }
});

// Get StatefulSets in a namespace
router.get('/statefulsets', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sAppsApi } = getK8sApis();
    
    const response = await k8sAppsApi.listNamespacedStatefulSet(namespace);
    
    const statefulsets = response.body.items.map(sts => ({
      name: sts.metadata.name,
      namespace: sts.metadata.namespace,
      ready: `${sts.status.readyReplicas || 0}/${sts.spec.replicas || 0}`,
      replicas: sts.spec.replicas || 0,
      age: sts.metadata.creationTimestamp,
      serviceName: sts.spec.serviceName,
      labels: sts.metadata.labels || {}
    }));
    
    res.json({ success: true, data: statefulsets });
  } catch (error) {
    logger.error('Failed to fetch statefulsets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statefulsets' });
  }
});

// Get DaemonSets in a namespace
router.get('/daemonsets', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sAppsApi } = getK8sApis();
    
    const response = await k8sAppsApi.listNamespacedDaemonSet(namespace);
    
    const daemonsets = response.body.items.map(ds => ({
      name: ds.metadata.name,
      namespace: ds.metadata.namespace,
      desired: ds.status.desiredNumberScheduled || 0,
      current: ds.status.currentNumberScheduled || 0,
      ready: ds.status.numberReady || 0,
      upToDate: ds.status.updatedNumberScheduled || 0,
      available: ds.status.numberAvailable || 0,
      age: ds.metadata.creationTimestamp,
      labels: ds.metadata.labels || {}
    }));
    
    res.json({ success: true, data: daemonsets });
  } catch (error) {
    logger.error('Failed to fetch daemonsets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch daemonsets' });
  }
});

// Get Jobs in a namespace
router.get('/jobs', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sBatchApi } = getK8sApis();
    
    const response = await k8sBatchApi.listNamespacedJob(namespace);
    
    const jobs = response.body.items.map(job => ({
      name: job.metadata.name,
      namespace: job.metadata.namespace,
      completions: `${job.status.succeeded || 0}/${job.spec.completions || 1}`,
      duration: job.status.completionTime ? 
        Math.floor((new Date(job.status.completionTime) - new Date(job.status.startTime)) / 1000) + 's' : 
        job.status.startTime ? Math.floor((new Date() - new Date(job.status.startTime)) / 1000) + 's' : 'N/A',
      age: job.metadata.creationTimestamp,
      active: job.status.active || 0,
      succeeded: job.status.succeeded || 0,
      failed: job.status.failed || 0,
      labels: job.metadata.labels || {}
    }));
    
    res.json({ success: true, data: jobs });
  } catch (error) {
    logger.error('Failed to fetch jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
});

// Get CronJobs in a namespace
router.get('/cronjobs', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sBatchApi } = getK8sApis();
    
    const response = await k8sBatchApi.listNamespacedCronJob(namespace);
    logger.info('✅ CronJobs fetched using BatchV1Api');
    
    const cronjobs = response.body.items.map(cronjob => ({
      name: cronjob.metadata.name,
      namespace: cronjob.metadata.namespace,
      schedule: cronjob.spec.schedule,
      suspend: cronjob.spec.suspend || false,
      active: cronjob.status.active?.length || 0,
      lastSchedule: cronjob.status.lastScheduleTime || 'Never',
      age: cronjob.metadata.creationTimestamp,
      labels: cronjob.metadata.labels || {}
    }));
    
    res.json({ success: true, data: cronjobs });
  } catch (error) {
    logger.error('Failed to fetch cronjobs:', error);
    
    // Provide meaningful error messages
    if (error.statusCode === 403) {
      res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions to access CronJobs',
        errorType: 'PERMISSION_DENIED'
      });
    } else if (error.statusCode === 404 || error.message.includes('no matches for kind')) {
      res.status(404).json({ 
        success: false, 
        error: 'CronJobs API not available in this cluster version',
        errorType: 'API_NOT_AVAILABLE'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch CronJobs',
        errorType: 'GENERAL_ERROR'
      });
    }
  }
});

// Get PersistentVolumeClaims in a namespace
router.get('/persistentvolumeclaims', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sApi } = getK8sApis();
    
    const response = await k8sApi.listNamespacedPersistentVolumeClaim(namespace);
    
    const pvcs = response.body.items.map(pvc => ({
      name: pvc.metadata.name,
      namespace: pvc.metadata.namespace,
      status: pvc.status.phase,
      volume: pvc.spec.volumeName || 'Pending',
      capacity: pvc.status.capacity?.storage || pvc.spec.resources?.requests?.storage || 'Unknown',
      accessModes: pvc.spec.accessModes || [],
      storageClass: pvc.spec.storageClassName || 'default',
      age: pvc.metadata.creationTimestamp,
      labels: pvc.metadata.labels || {}
    }));
    
    res.json({ success: true, data: pvcs });
  } catch (error) {
    logger.error('Failed to fetch persistentvolumeclaims:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch persistentvolumeclaims' });
  }
});

// Get Ingress in a namespace
router.get('/ingress', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sNetworkingApi } = getK8sApis();
    
    const response = await k8sNetworkingApi.listNamespacedIngress(namespace);
    
    const ingresses = response.body.items.map(ingress => ({
      name: ingress.metadata.name,
      namespace: ingress.metadata.namespace,
      className: ingress.spec.ingressClassName || 'none',
      hosts: ingress.spec.rules?.map(rule => rule.host).filter(Boolean) || [],
      address: ingress.status.loadBalancer?.ingress?.[0]?.ip || 
               ingress.status.loadBalancer?.ingress?.[0]?.hostname || 'Pending',
      ports: '80,443',
      age: ingress.metadata.creationTimestamp,
      labels: ingress.metadata.labels || {}
    }));
    
    res.json({ success: true, data: ingresses });
  } catch (error) {
    logger.error('Failed to fetch ingress:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ingress' });
  }
});

// Get Helm Releases (Custom Resource)
router.get('/helm-releases', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sApi } = getK8sApis();
    
    // Get secrets with Helm release data
    const response = await k8sApi.listNamespacedSecret(namespace);
    
    const helmReleases = response.body.items
      .filter(secret => secret.type === 'helm.sh/release.v1')
      .map(secret => {
        const releaseName = secret.metadata.labels?.name || secret.metadata.name.replace(/^sh\.helm\.release\.v1\./, '');
        const version = secret.metadata.labels?.version || '1';
        
        return {
          name: releaseName,
          namespace: secret.metadata.namespace,
          revision: version,
          updated: secret.metadata.creationTimestamp,
          status: secret.metadata.labels?.status || 'deployed',
          chart: secret.metadata.labels?.chart || 'unknown',
          app_version: secret.metadata.labels?.app_version || 'unknown',
          age: secret.metadata.creationTimestamp,
          labels: secret.metadata.labels || {}
        };
      });
    
    res.json({ success: true, data: helmReleases });
  } catch (error) {
    logger.error('Failed to fetch helm releases:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch helm releases' });
  }
});

// Get SparkApplications (Custom Resource)
router.get('/sparkapplications', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { k8sCustomApi } = getK8sApis();
    
    // Try to get SparkApplication CRDs
    const response = await k8sCustomApi.listNamespacedCustomObject(
      'sparkoperator.k8s.io',
      'v1beta2',
      namespace,
      'sparkapplications'
    );
    
    const sparkApps = response.body.items.map(app => ({
      name: app.metadata.name,
      namespace: app.metadata.namespace,
      state: app.status?.applicationState?.state || 'Unknown',
      executorInstances: app.spec?.executor?.instances || 0,
      submissionTime: app.status?.submissionTime || app.metadata.creationTimestamp,
      completionTime: app.status?.terminationTime,
      age: app.metadata.creationTimestamp,
      driver: app.spec?.driver?.serviceAccount || 'default',
      labels: app.metadata.labels || {}
    }));
    
    res.json({ success: true, data: sparkApps });
  } catch (error) {
    // If SparkApplication CRD doesn't exist, return empty array
    if (error.statusCode === 404) {
      res.json({ success: true, data: [] });
    } else {
      logger.error('Failed to fetch spark applications:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch spark applications' });
    }
  }
});

// Get pod logs
router.get('/pods/:name/logs', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', container, lines = '100', timestamps = 'true' } = req.query;
    const { k8sApi } = getK8sApis();
    
    // Parse lines to integer, ensure it's a valid number
    const tailLines = Math.min(Math.max(parseInt(lines) || 100, 1), 1000);
    
    // Convert timestamps to boolean properly
    const includeTimestamps = timestamps === 'true' || timestamps === true;
    
    const response = await k8sApi.readNamespacedPodLog(
      name,
      namespace,
      container,           // container
      false,              // follow
      undefined,          // limitBytes
      undefined,          // pretty
      false,              // previous
      undefined,          // sinceSeconds
      tailLines,          // tailLines
      includeTimestamps   // timestamps
    );
    
    // Check if logs are empty or just whitespace
    const logs = response.body || '';
    const hasLogs = logs.trim().length > 0;
    
    res.json({ 
      success: true, 
      data: { 
        logs: hasLogs ? logs : 'No logs available for this pod.\n\n💡 This could mean:\n- The pod is starting up\n- No output has been generated\n- Logs have been rotated\n- Insufficient permissions to view logs',
        hasLogs,
        podName: name,
        namespace,
        lineCount: logs.split('\n').length
      } 
    });
  } catch (error) {
    logger.error('Failed to fetch pod logs:', {
      podName: req.params.name,
      namespace: req.query.namespace,
      error: error.message,
      code: error.statusCode || error.response?.statusCode
    });
    
    // Provide user-friendly error messages based on error type
    let userMessage = 'Unable to fetch logs';
    let noDataMessage = '';
    
    if (error.statusCode === 403 || error.response?.statusCode === 403) {
      noDataMessage = '🔒 Insufficient permissions to view pod logs.\n\n' +
        'This usually means:\n' +
        '• The service account lacks log viewing permissions\n' +
        '• RBAC policies restrict log access\n' +
        '• The pod is in a restricted namespace';
      userMessage = 'Insufficient permissions';
    } else if (error.statusCode === 404 || error.response?.statusCode === 404) {
      noDataMessage = '❌ Pod not found or no logs available.\n\n' +
        'This could mean:\n' +
        '• The pod has been deleted\n' +
        '• The pod name or namespace is incorrect\n' +
        '• The pod hasn\'t started yet';
      userMessage = 'Pod not found';
    } else if (error.message?.includes('strconv.ParseInt')) {
      noDataMessage = '⚠️ Configuration error in log parameters.\n\n' +
        'The system is experiencing a parameter parsing issue.\n' +
        'Please try again or contact your administrator.';
      userMessage = 'Configuration error';
    } else {
      noDataMessage = '📡 Unable to retrieve logs at this time.\n\n' +
        'This might be temporary. Please try:\n' +
        '• Refreshing in a few moments\n' +
        '• Checking if the pod is running\n' +
        '• Verifying cluster connectivity';
    }
    
    // Return graceful "no data" response instead of error
    res.json({ 
      success: true, 
      data: { 
        logs: noDataMessage,
        hasLogs: false,
        podName: req.params.name,
        namespace: req.query.namespace || 'default',
        error: userMessage,
        lineCount: 0
      } 
    });
  }
});

// Get resource details (YAML)
router.get('/:resourceType/:name', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { resourceType, name } = req.params;
    const { namespace = 'default' } = req.query;
    const { k8sApi, k8sAppsApi, k8sNetworkingApi, k8sBatchApi, k8sCustomApi } = getK8sApis();
    
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
      case 'statefulset':
        response = await k8sAppsApi.readNamespacedStatefulSet(name, namespace);
        break;
      case 'daemonset':
        response = await k8sAppsApi.readNamespacedDaemonSet(name, namespace);
        break;
      case 'job':
        response = await k8sBatchApi.readNamespacedJob(name, namespace);
        break;
      case 'cronjob':
        response = await k8sBatchApi.readNamespacedCronJob(name, namespace);
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
      case 'persistentvolumeclaim':
        response = await k8sApi.readNamespacedPersistentVolumeClaim(name, namespace);
        break;
      case 'ingress':
        response = await k8sNetworkingApi.readNamespacedIngress(name, namespace);
        break;
      case 'helm-release':
        // For Helm releases, we need to find the secret that contains the release data
        const secretName = `sh.helm.release.v1.${name}.v1`;
        try {
          response = await k8sApi.readNamespacedSecret(secretName, namespace);
        } catch (error) {
          // If exact secret not found, try to find any matching helm release secret
          const secrets = await k8sApi.listNamespacedSecret(namespace);
          const helmSecret = secrets.body.items.find(secret => 
            secret.type === 'helm.sh/release.v1' && 
            (secret.metadata.labels?.name === name || secret.metadata.name.includes(name))
          );
          if (helmSecret) {
            response = { body: helmSecret };
          } else {
            throw new Error('Helm release not found');
          }
        }
        break;
      case 'sparkapplication':
        try {
          response = await k8sCustomApi.getNamespacedCustomObject(
            'sparkoperator.k8s.io',
            'v1beta2',
            namespace,
            'sparkapplications',
            name
          );
        } catch (error) {
          if (error.statusCode === 404) {
            return res.status(404).json({ success: false, error: 'SparkApplication CRD not available in this cluster' });
          }
          throw error;
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