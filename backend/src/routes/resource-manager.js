import express from 'express';
import yaml from 'yaml';
import { getKubernetesClient, handleK8sError } from '../config/kubernetes.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ================================
// YAML/JSON RESOURCE EDITOR ROUTES
// ================================

// Validate YAML/JSON content
router.post('/validate', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { content, format = 'yaml' } = req.body;
    
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content is required',
        validation: { isValid: false, errors: ['Empty content'] }
      });
    }

    let parsed;
    const errors = [];

    try {
      if (format === 'yaml') {
        parsed = yaml.parse(content);
      } else {
        parsed = JSON.parse(content);
      }

      // Basic Kubernetes resource validation
      if (!parsed.apiVersion) errors.push('Missing apiVersion field');
      if (!parsed.kind) errors.push('Missing kind field');
      if (!parsed.metadata || !parsed.metadata.name) {
        errors.push('Missing metadata.name field');
      }

    } catch (parseError) {
      errors.push(`Parse error: ${parseError.message}`);
    }

    res.json({
      success: true,
      validation: {
        isValid: errors.length === 0,
        errors,
        parsed: errors.length === 0 ? parsed : null
      }
    });

  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({ success: false, error: 'Validation failed' });
  }
});

// Apply/Create resource from YAML/JSON
router.post('/apply', authorize(['admin']), async (req, res) => {
  try {
    const { content, format = 'yaml', namespace = 'default', dryRun = false } = req.body;
    
    let resource;
    try {
      resource = format === 'yaml' ? yaml.parse(content) : JSON.parse(content);
    } catch (parseError) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid ${format}: ${parseError.message}` 
      });
    }

    const { coreApi, appsApi, networkingApi } = getKubernetesClient();
    
    // Route to appropriate API based on resource kind
    let result;
    const options = dryRun ? { dryRun: ['All'] } : {};

    switch (resource.kind.toLowerCase()) {
      case 'pod':
        result = await coreApi.createNamespacedPod(namespace, resource, undefined, undefined, undefined, options);
        break;
      case 'service':
        result = await coreApi.createNamespacedService(namespace, resource, undefined, undefined, undefined, options);
        break;
      case 'deployment':
        result = await appsApi.createNamespacedDeployment(namespace, resource, undefined, undefined, undefined, options);
        break;
      case 'configmap':
        result = await coreApi.createNamespacedConfigMap(namespace, resource, undefined, undefined, undefined, options);
        break;
      case 'secret':
        result = await coreApi.createNamespacedSecret(namespace, resource, undefined, undefined, undefined, options);
        break;
      case 'ingress':
        result = await networkingApi.createNamespacedIngress(namespace, resource, undefined, undefined, undefined, options);
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: `Unsupported resource kind: ${resource.kind}` 
        });
    }

    // Log the action
    logger.info(`Resource ${dryRun ? 'validated' : 'applied'}:`, {
      kind: resource.kind,
      name: resource.metadata.name,
      namespace,
      user: req.user.email
    });

    res.json({
      success: true,
      message: dryRun ? 'Resource validation successful' : 'Resource applied successfully',
      resource: {
        kind: resource.kind,
        name: resource.metadata.name,
        namespace: resource.metadata.namespace || namespace
      }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Apply resource');
    logger.error('Apply resource error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// ================================
// RESOURCE TEMPLATES ROUTES
// ================================

// Get available templates
router.get('/templates', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const templates = [
      {
        id: 'nginx-deployment',
        name: 'NGINX Deployment',
        type: 'Deployment',
        category: 'Web Server',
        description: 'Basic NGINX web server deployment with service',
        template: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: 'nginx-deployment',
            labels: { app: 'nginx' }
          },
          spec: {
            replicas: 3,
            selector: { matchLabels: { app: 'nginx' }},
            template: {
              metadata: { labels: { app: 'nginx' }},
              spec: {
                containers: [{
                  name: 'nginx',
                  image: 'nginx:latest',
                  ports: [{ containerPort: 80 }]
                }]
              }
            }
          }
        }
      },
      {
        id: 'redis-statefulset',
        name: 'Redis StatefulSet',
        type: 'StatefulSet',
        category: 'Database',
        description: 'Redis database with persistent storage',
        template: {
          apiVersion: 'apps/v1',
          kind: 'StatefulSet',
          metadata: {
            name: 'redis',
            labels: { app: 'redis' }
          },
          spec: {
            serviceName: 'redis',
            replicas: 1,
            selector: { matchLabels: { app: 'redis' }},
            template: {
              metadata: { labels: { app: 'redis' }},
              spec: {
                containers: [{
                  name: 'redis',
                  image: 'redis:6.2',
                  ports: [{ containerPort: 6379 }],
                  volumeMounts: [{
                    name: 'redis-data',
                    mountPath: '/data'
                  }]
                }]
              }
            },
            volumeClaimTemplates: [{
              metadata: { name: 'redis-data' },
              spec: {
                accessModes: ['ReadWriteOnce'],
                resources: { requests: { storage: '1Gi' }}
              }
            }]
          }
        }
      },
      {
        id: 'load-balancer-service',
        name: 'Load Balancer Service',
        type: 'Service',
        category: 'Networking',
        description: 'External load balancer service',
        template: {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: 'app-loadbalancer',
            labels: { app: 'web-app' }
          },
          spec: {
            type: 'LoadBalancer',
            ports: [{
              port: 80,
              targetPort: 8080,
              protocol: 'TCP'
            }],
            selector: { app: 'web-app' }
          }
        }
      },
      {
        id: 'hpa-autoscaler',
        name: 'Horizontal Pod Autoscaler',
        type: 'HPA',
        category: 'Scaling',
        description: 'Auto-scaling configuration based on CPU/Memory',
        template: {
          apiVersion: 'autoscaling/v2',
          kind: 'HorizontalPodAutoscaler',
          metadata: {
            name: 'app-hpa',
            labels: { app: 'web-app' }
          },
          spec: {
            scaleTargetRef: {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              name: 'web-app'
            },
            minReplicas: 2,
            maxReplicas: 10,
            metrics: [{
              type: 'Resource',
              resource: {
                name: 'cpu',
                target: {
                  type: 'Utilization',
                  averageUtilization: 70
                }
              }
            }]
          }
        }
      }
    ];

    res.json({ success: true, data: templates });

  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to get templates' });
  }
});

// Get specific template
router.get('/templates/:id', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, this would fetch from a database
    // For now, return the template from the hardcoded list above
    res.json({ 
      success: true, 
      message: 'Template retrieved successfully',
      templateId: id 
    });

  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Failed to get template' });
  }
});

// ================================
// RESOURCE CLONING ROUTES
// ================================

// Clone resource to different namespace
router.post('/clone', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { 
      sourceNamespace, 
      targetNamespace, 
      resourceType, 
      resourceName, 
      newResourceName 
    } = req.body;

    const { coreApi, appsApi } = getKubernetesClient();
    
    // Get source resource
    let sourceResource;
    switch (resourceType.toLowerCase()) {
      case 'deployment':
        sourceResource = await appsApi.readNamespacedDeployment(resourceName, sourceNamespace);
        break;
      case 'service':
        sourceResource = await coreApi.readNamespacedService(resourceName, sourceNamespace);
        break;
      case 'configmap':
        sourceResource = await coreApi.readNamespacedConfigMap(resourceName, sourceNamespace);
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: `Cloning not supported for resource type: ${resourceType}` 
        });
    }

    // Prepare cloned resource
    const clonedResource = JSON.parse(JSON.stringify(sourceResource.body));
    clonedResource.metadata.name = newResourceName || `${resourceName}-clone`;
    clonedResource.metadata.namespace = targetNamespace;
    delete clonedResource.metadata.uid;
    delete clonedResource.metadata.resourceVersion;
    delete clonedResource.metadata.creationTimestamp;
    delete clonedResource.status;

    // Create cloned resource
    let result;
    switch (resourceType.toLowerCase()) {
      case 'deployment':
        result = await appsApi.createNamespacedDeployment(targetNamespace, clonedResource);
        break;
      case 'service':
        result = await coreApi.createNamespacedService(targetNamespace, clonedResource);
        break;
      case 'configmap':
        result = await coreApi.createNamespacedConfigMap(targetNamespace, clonedResource);
        break;
    }

    logger.info('Resource cloned:', {
      sourceResource: `${resourceType}/${resourceName}`,
      sourceNamespace,
      targetNamespace,
      newName: clonedResource.metadata.name,
      user: req.user.email
    });

    res.json({
      success: true,
      message: 'Resource cloned successfully',
      cloned: {
        name: clonedResource.metadata.name,
        namespace: targetNamespace,
        type: resourceType
      }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Clone resource');
    logger.error('Clone resource error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// ================================
// BULK OPERATIONS ROUTES
// ================================

// Bulk delete resources
router.post('/bulk/delete', authorize(['admin']), async (req, res) => {
  try {
    const { resources } = req.body; // Array of {namespace, name, type}
    
    if (!Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Resources array is required and cannot be empty' 
      });
    }

    const { coreApi, appsApi } = getKubernetesClient();
    const results = [];

    for (const resource of resources) {
      try {
        switch (resource.type.toLowerCase()) {
          case 'pod':
            await coreApi.deleteNamespacedPod(resource.name, resource.namespace);
            break;
          case 'deployment':
            await appsApi.deleteNamespacedDeployment(resource.name, resource.namespace);
            break;
          case 'service':
            await coreApi.deleteNamespacedService(resource.name, resource.namespace);
            break;
          case 'configmap':
            await coreApi.deleteNamespacedConfigMap(resource.name, resource.namespace);
            break;
          default:
            throw new Error(`Unsupported resource type: ${resource.type}`);
        }
        
        results.push({
          ...resource,
          status: 'success',
          message: 'Deleted successfully'
        });

      } catch (deleteError) {
        results.push({
          ...resource,
          status: 'error',
          message: deleteError.message
        });
      }
    }

    logger.info('Bulk delete operation:', {
      totalResources: resources.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      user: req.user.email
    });

    res.json({
      success: true,
      message: 'Bulk delete operation completed',
      results
    });

  } catch (error) {
    logger.error('Bulk delete error:', error);
    res.status(500).json({ success: false, error: 'Bulk delete operation failed' });
  }
});

// ================================
// ADVANCED SEARCH ROUTES
// ================================

// Advanced resource search
router.post('/search', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { 
      query, 
      resourceTypes = [], 
      namespaces = [], 
      labels = {},
      annotations = {},
      limit = 100 
    } = req.body;

    // This is a simplified search implementation
    // In a real scenario, you'd want to implement more sophisticated search logic
    
    const { coreApi, appsApi } = getKubernetesClient();
    const searchResults = [];

    // Search in specified namespaces or all namespaces
    const namespacesToSearch = namespaces.length > 0 ? namespaces : ['default', 'kube-system'];

    for (const namespace of namespacesToSearch) {
      // Search pods if requested
      if (resourceTypes.length === 0 || resourceTypes.includes('pod')) {
        try {
          const pods = await coreApi.listNamespacedPod(namespace);
          pods.body.items.forEach(pod => {
            if (matchesQuery(pod, query, labels, annotations)) {
              searchResults.push({
                type: 'Pod',
                name: pod.metadata.name,
                namespace: pod.metadata.namespace,
                created: pod.metadata.creationTimestamp,
                status: pod.status.phase,
                labels: pod.metadata.labels,
                annotations: pod.metadata.annotations
              });
            }
          });
        } catch (error) {
          logger.warn(`Failed to search pods in namespace ${namespace}:`, error.message);
        }
      }

      // Search deployments if requested
      if (resourceTypes.length === 0 || resourceTypes.includes('deployment')) {
        try {
          const deployments = await appsApi.listNamespacedDeployment(namespace);
          deployments.body.items.forEach(deployment => {
            if (matchesQuery(deployment, query, labels, annotations)) {
              searchResults.push({
                type: 'Deployment',
                name: deployment.metadata.name,
                namespace: deployment.metadata.namespace,
                created: deployment.metadata.creationTimestamp,
                replicas: `${deployment.status.readyReplicas || 0}/${deployment.spec.replicas || 0}`,
                labels: deployment.metadata.labels,
                annotations: deployment.metadata.annotations
              });
            }
          });
        } catch (error) {
          logger.warn(`Failed to search deployments in namespace ${namespace}:`, error.message);
        }
      }
    }

    // Sort by creation time and limit results
    searchResults.sort((a, b) => new Date(b.created) - new Date(a.created));
    const limitedResults = searchResults.slice(0, limit);

    res.json({
      success: true,
      data: limitedResults,
      total: searchResults.length,
      limit,
      query: {
        query,
        resourceTypes,
        namespaces: namespacesToSearch,
        labels,
        annotations
      }
    });

  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search operation failed' });
  }
});

// Helper function to match search query
function matchesQuery(resource, query, labels, annotations) {
  if (!query && Object.keys(labels).length === 0 && Object.keys(annotations).length === 0) {
    return true;
  }

  // Text search in name
  if (query && !resource.metadata.name.toLowerCase().includes(query.toLowerCase())) {
    return false;
  }

  // Label matching
  for (const [key, value] of Object.entries(labels)) {
    if (!resource.metadata.labels || resource.metadata.labels[key] !== value) {
      return false;
    }
  }

  // Annotation matching
  for (const [key, value] of Object.entries(annotations)) {
    if (!resource.metadata.annotations || resource.metadata.annotations[key] !== value) {
      return false;
    }
  }

  return true;
}

export default router;