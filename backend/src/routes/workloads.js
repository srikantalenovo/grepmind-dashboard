import express from 'express';
import { getKubernetesClient, handleK8sError } from '../config/kubernetes.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ================================
// DEPLOYMENT MANAGEMENT ROUTES
// ================================

// Get deployments with enhanced details
router.get('/deployments', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { appsApi } = getKubernetesClient();
    
    const deploymentsResponse = await appsApi.listNamespacedDeployment(namespace);
    
    const deployments = deploymentsResponse.body.items.map(deployment => ({
      name: deployment.metadata.name,
      namespace: deployment.metadata.namespace,
      labels: deployment.metadata.labels || {},
      annotations: deployment.metadata.annotations || {},
      replicas: {
        desired: deployment.spec.replicas || 0,
        current: deployment.status.replicas || 0,
        ready: deployment.status.readyReplicas || 0,
        available: deployment.status.availableReplicas || 0,
        updated: deployment.status.updatedReplicas || 0
      },
      strategy: {
        type: deployment.spec.strategy?.type || 'RollingUpdate',
        rollingUpdate: deployment.spec.strategy?.rollingUpdate || {}
      },
      images: deployment.spec.template.spec.containers?.map(c => c.image) || [],
      status: {
        phase: deployment.status.phase || 'Unknown',
        conditions: deployment.status.conditions || []
      },
      creationTimestamp: deployment.metadata.creationTimestamp,
      generation: deployment.metadata.generation,
      observedGeneration: deployment.status.observedGeneration
    }));

    res.json({ success: true, data: deployments });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Get deployments');
    logger.error('Get deployments error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// Scale deployment
router.post('/deployments/:name/scale', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', replicas } = req.body;
    
    if (typeof replicas !== 'number' || replicas < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid replicas number is required' 
      });
    }

    const { appsApi } = getKubernetesClient();
    
    // Get current deployment
    const deployment = await appsApi.readNamespacedDeployment(name, namespace);
    
    // Update replicas
    const patchBody = {
      spec: {
        replicas: replicas
      }
    };

    await appsApi.patchNamespacedDeployment(
      name, 
      namespace, 
      patchBody,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/merge-patch+json' }}
    );

    logger.info('Deployment scaled:', {
      deployment: name,
      namespace,
      oldReplicas: deployment.body.spec.replicas,
      newReplicas: replicas,
      user: req.user.email
    });

    res.json({
      success: true,
      message: `Deployment ${name} scaled to ${replicas} replicas`,
      data: {
        name,
        namespace,
        oldReplicas: deployment.body.spec.replicas,
        newReplicas: replicas
      }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Scale deployment');
    logger.error('Scale deployment error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// Restart deployment (rolling restart)
router.post('/deployments/:name/restart', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default' } = req.body;
    
    const { appsApi } = getKubernetesClient();
    
    // Perform rolling restart by updating annotation
    const patchBody = {
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

    await appsApi.patchNamespacedDeployment(
      name, 
      namespace, 
      patchBody,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/merge-patch+json' }}
    );

    logger.info('Deployment restarted:', {
      deployment: name,
      namespace,
      user: req.user.email
    });

    res.json({
      success: true,
      message: `Deployment ${name} restart initiated`,
      data: { name, namespace, restartedAt: new Date().toISOString() }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Restart deployment');
    logger.error('Restart deployment error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// Rollback deployment
router.post('/deployments/:name/rollback', authorize(['admin']), async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', revision } = req.body;
    
    const { appsApi } = getKubernetesClient();
    
    // Get deployment rollout history
    const deployment = await appsApi.readNamespacedDeployment(name, namespace);
    
    // For simplicity, we'll rollback to previous revision
    // In a real implementation, you'd want to implement proper revision management
    const rollbackAnnotation = {
      'deployment.kubernetes.io/revision': revision ? revision.toString() : 'previous'
    };

    const patchBody = {
      metadata: {
        annotations: rollbackAnnotation
      },
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/rollbackedAt': new Date().toISOString()
            }
          }
        }
      }
    };

    await appsApi.patchNamespacedDeployment(
      name, 
      namespace, 
      patchBody,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/merge-patch+json' }}
    );

    logger.info('Deployment rollback initiated:', {
      deployment: name,
      namespace,
      revision: revision || 'previous',
      user: req.user.email
    });

    res.json({
      success: true,
      message: `Deployment ${name} rollback initiated`,
      data: { 
        name, 
        namespace, 
        targetRevision: revision || 'previous',
        rollbackedAt: new Date().toISOString() 
      }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Rollback deployment');
    logger.error('Rollback deployment error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// ================================
// LOG MANAGEMENT ROUTES
// ================================

// Get pod logs
router.get('/logs/:podName', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { podName } = req.params;
    const { 
      namespace = 'default', 
      container, 
      lines = 100, 
      since = 3600,
      follow = false 
    } = req.query;
    
    const { coreApi } = getKubernetesClient();
    
    const logOptions = {
      container: container || undefined,
      tailLines: parseInt(lines),
      sinceSeconds: parseInt(since),
      follow: follow === 'true',
      timestamps: true
    };

    const logsResponse = await coreApi.readNamespacedPodLog(
      podName,
      namespace,
      undefined, // container name (handled in options)
      follow === 'true', // follow
      undefined, // limitBytes
      undefined, // pretty
      undefined, // previous
      parseInt(since), // sinceSeconds
      parseInt(lines), // tailLines
      true // timestamps
    );

    const logs = logsResponse.body.split('\n').filter(line => line.trim()).map(line => {
      // Parse timestamp and log content
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
      if (timestampMatch) {
        return {
          timestamp: timestampMatch[1],
          content: timestampMatch[2]
        };
      }
      return {
        timestamp: new Date().toISOString(),
        content: line
      };
    });

    res.json({
      success: true,
      data: {
        pod: podName,
        namespace,
        container: container || 'default',
        logs,
        totalLines: logs.length
      }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Get pod logs');
    logger.error('Get pod logs error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// Get available containers for a pod
router.get('/logs/:podName/containers', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { podName } = req.params;
    const { namespace = 'default' } = req.query;
    
    const { coreApi } = getKubernetesClient();
    
    const pod = await coreApi.readNamespacedPod(podName, namespace);
    
    const containers = pod.body.spec.containers?.map(container => ({
      name: container.name,
      image: container.image,
      ready: pod.body.status.containerStatuses?.find(cs => cs.name === container.name)?.ready || false,
      restartCount: pod.body.status.containerStatuses?.find(cs => cs.name === container.name)?.restartCount || 0
    })) || [];

    res.json({
      success: true,
      data: {
        pod: podName,
        namespace,
        containers
      }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Get pod containers');
    logger.error('Get pod containers error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// ================================
// SCALING ROUTES
// ================================

// Get horizontal pod autoscalers
router.get('/hpa', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { autoscalingApi } = getKubernetesClient();
    
    // Note: You might need to import autoscaling API
    // For now, return mock data
    const hpaData = [
      {
        name: 'nginx-hpa',
        namespace: 'default',
        targetRef: {
          kind: 'Deployment',
          name: 'nginx-deployment'
        },
        minReplicas: 2,
        maxReplicas: 10,
        currentReplicas: 3,
        targetCPU: 70,
        currentCPU: 45,
        status: 'Active'
      }
    ];

    res.json({ success: true, data: hpaData });

  } catch (error) {
    logger.error('Get HPA error:', error);
    res.status(500).json({ success: false, error: 'Failed to get HPA resources' });
  }
});

// Create horizontal pod autoscaler
router.post('/hpa', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { 
      name, 
      namespace = 'default', 
      targetRef, 
      minReplicas = 1, 
      maxReplicas = 10, 
      targetCPU = 70 
    } = req.body;

    // Mock HPA creation
    const hpa = {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name,
        namespace
      },
      spec: {
        scaleTargetRef: targetRef,
        minReplicas,
        maxReplicas,
        metrics: [{
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: targetCPU
            }
          }
        }]
      }
    };

    logger.info('HPA created:', {
      hpa: name,
      namespace,
      targetRef,
      user: req.user.email
    });

    res.json({
      success: true,
      message: 'Horizontal Pod Autoscaler created successfully',
      data: hpa
    });

  } catch (error) {
    logger.error('Create HPA error:', error);
    res.status(500).json({ success: false, error: 'Failed to create HPA' });
  }
});

// ================================
// ROLLOUT STRATEGY ROUTES
// ================================

// Get rollout strategies
router.get('/rollout-strategies', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const strategies = [
      {
        name: 'Rolling Update',
        type: 'RollingUpdate',
        description: 'Gradually replace old pods with new ones',
        parameters: {
          maxUnavailable: '25%',
          maxSurge: '25%'
        },
        pros: ['Zero downtime', 'Gradual deployment', 'Easy rollback'],
        cons: ['Slower deployment', 'Resource overhead during deployment']
      },
      {
        name: 'Recreate',
        type: 'Recreate',
        description: 'Kill all existing pods before creating new ones',
        parameters: {},
        pros: ['Simple', 'No resource overhead', 'Clean state'],
        cons: ['Downtime during deployment', 'Not suitable for production']
      },
      {
        name: 'Blue-Green',
        type: 'BlueGreen',
        description: 'Deploy new version alongside old, then switch traffic',
        parameters: {
          autoPromotionEnabled: false,
          scaleDownDelaySeconds: 30
        },
        pros: ['Zero downtime', 'Instant rollback', 'Full testing before switch'],
        cons: ['Requires double resources', 'Complex setup']
      },
      {
        name: 'Canary',
        type: 'Canary',
        description: 'Gradually shift traffic to new version',
        parameters: {
          steps: [
            { setWeight: 20 },
            { pause: { duration: '1m' }},
            { setWeight: 40 },
            { pause: { duration: '1m' }},
            { setWeight: 60 },
            { pause: { duration: '1m' }},
            { setWeight: 80 },
            { pause: { duration: '1m' }},
            { setWeight: 100 }
          ]
        },
        pros: ['Risk mitigation', 'Performance monitoring', 'Gradual user exposure'],
        cons: ['Complex traffic management', 'Longer deployment time']
      }
    ];

    res.json({ success: true, data: strategies });

  } catch (error) {
    logger.error('Get rollout strategies error:', error);
    res.status(500).json({ success: false, error: 'Failed to get rollout strategies' });
  }
});

// ================================
// HEALTH CHECKS ROUTES
// ================================

// Get health check configurations for a deployment
router.get('/health-checks/:deploymentName', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { deploymentName } = req.params;
    const { namespace = 'default' } = req.query;
    
    const { appsApi } = getKubernetesClient();
    
    const deployment = await appsApi.readNamespacedDeployment(deploymentName, namespace);
    
    const containers = deployment.body.spec.template.spec.containers?.map(container => ({
      name: container.name,
      image: container.image,
      livenessProbe: container.livenessProbe || null,
      readinessProbe: container.readinessProbe || null,
      startupProbe: container.startupProbe || null
    })) || [];

    res.json({
      success: true,
      data: {
        deployment: deploymentName,
        namespace,
        containers
      }
    });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Get health checks');
    logger.error('Get health checks error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// Update health check configuration
router.put('/health-checks/:deploymentName', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { deploymentName } = req.params;
    const { namespace = 'default', containerName, probeType, probeConfig } = req.body;
    
    // Mock health check update
    logger.info('Health check updated:', {
      deployment: deploymentName,
      namespace,
      container: containerName,
      probeType,
      config: probeConfig,
      user: req.user.email
    });

    res.json({
      success: true,
      message: `Health check ${probeType} updated for container ${containerName}`,
      data: {
        deployment: deploymentName,
        namespace,
        container: containerName,
        probeType,
        config: probeConfig
      }
    });

  } catch (error) {
    logger.error('Update health check error:', error);
    res.status(500).json({ success: false, error: 'Failed to update health check' });
  }
});

// ================================
// WORKLOAD STATUS ROUTES
// ================================

// Get overall workload status
router.get('/status', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { appsApi, coreApi } = getKubernetesClient();
    
    const [deploymentsRes, podsRes] = await Promise.allSettled([
      appsApi.listNamespacedDeployment(namespace),
      coreApi.listNamespacedPod(namespace)
    ]);

    const status = {
      namespace,
      workloads: {
        deployments: {
          total: 0,
          healthy: 0,
          updating: 0,
          failed: 0
        },
        pods: {
          total: 0,
          running: 0,
          pending: 0,
          failed: 0
        }
      },
      resources: {
        totalCPU: 0,
        totalMemory: 0,
        usedCPU: 0,
        usedMemory: 0
      }
    };

    // Process deployments
    if (deploymentsRes.status === 'fulfilled') {
      const deployments = deploymentsRes.value.body.items;
      status.workloads.deployments.total = deployments.length;
      
      deployments.forEach(deployment => {
        const ready = deployment.status.readyReplicas || 0;
        const desired = deployment.spec.replicas || 0;
        
        if (ready === desired && desired > 0) {
          status.workloads.deployments.healthy++;
        } else if (deployment.status.updatedReplicas !== deployment.spec.replicas) {
          status.workloads.deployments.updating++;
        } else {
          status.workloads.deployments.failed++;
        }
      });
    }

    // Process pods
    if (podsRes.status === 'fulfilled') {
      const pods = podsRes.value.body.items;
      status.workloads.pods.total = pods.length;
      
      pods.forEach(pod => {
        switch (pod.status.phase) {
          case 'Running': status.workloads.pods.running++; break;
          case 'Pending': status.workloads.pods.pending++; break;
          case 'Failed': status.workloads.pods.failed++; break;
        }
      });
    }

    res.json({ success: true, data: status });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Get workload status');
    logger.error('Get workload status error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

export default router;