import express from 'express';
import { getKubernetesClient, handleK8sError } from '../config/kubernetes.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ================================
// SECURITY SCANNING ROUTES
// ================================

// Get security scan overview
router.get('/scan/overview', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    // Mock security scan data - in a real implementation, this would integrate with
    // vulnerability scanners like Trivy, Clair, or commercial solutions
    const overview = {
      lastScan: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      totalImages: 24,
      scannedImages: 22,
      vulnerabilities: {
        critical: 7,
        high: 23,
        medium: 45,
        low: 89,
        total: 164
      },
      complianceScore: 78,
      securityScore: 82,
      trends: {
        vulnerabilities: 'decreasing',
        compliance: 'improving',
        lastWeekChange: -5
      }
    };

    res.json({ success: true, data: overview });

  } catch (error) {
    logger.error('Get security overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to get security overview' });
  }
});

// Get vulnerability scan results
router.get('/scan/vulnerabilities', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace, severity, limit = 50 } = req.query;
    
    // Mock vulnerability data
    let vulnerabilities = [
      {
        id: 'vuln-1',
        cve: 'CVE-2021-23017',
        severity: 'critical',
        score: 9.8,
        description: 'nginx resolver denial of service vulnerability',
        package: 'nginx',
        installedVersion: '1.19.0',
        fixedVersion: '1.20.1',
        image: 'nginx:1.19',
        namespace: 'default',
        pods: ['nginx-deployment-123', 'nginx-deployment-456'],
        publishedDate: '2021-05-20T00:00:00Z',
        links: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-23017']
      },
      {
        id: 'vuln-2',
        cve: 'CVE-2021-36159',
        severity: 'high',
        score: 8.1,
        description: 'libfetch buffer overflow vulnerability',
        package: 'libfetch',
        installedVersion: '2.39',
        fixedVersion: '2.40',
        image: 'alpine:3.12',
        namespace: 'production',
        pods: ['api-backend-789'],
        publishedDate: '2021-07-15T00:00:00Z',
        links: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-36159']
      },
      {
        id: 'vuln-3',
        cve: 'CVE-2021-3711',
        severity: 'medium',
        score: 6.5,
        description: 'OpenSSL buffer overflow vulnerability',
        package: 'openssl',
        installedVersion: '1.1.1',
        fixedVersion: '1.1.1l',
        image: 'ubuntu:18.04',
        namespace: 'staging',
        pods: ['worker-pod-101'],
        publishedDate: '2021-08-24T00:00:00Z',
        links: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-3711']
      }
    ];

    // Filter by namespace if specified
    if (namespace && namespace !== 'all') {
      vulnerabilities = vulnerabilities.filter(vuln => vuln.namespace === namespace);
    }

    // Filter by severity if specified
    if (severity && severity !== 'all') {
      vulnerabilities = vulnerabilities.filter(vuln => vuln.severity === severity);
    }

    // Sort by severity score (highest first)
    vulnerabilities.sort((a, b) => b.score - a.score);

    // Limit results
    vulnerabilities = vulnerabilities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: vulnerabilities,
      total: vulnerabilities.length,
      filters: { namespace, severity }
    });

  } catch (error) {
    logger.error('Get vulnerabilities error:', error);
    res.status(500).json({ success: false, error: 'Failed to get vulnerabilities' });
  }
});

// Start security scan
router.post('/scan/start', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { namespace, scanType = 'full', images = [] } = req.body;
    
    // Mock scan initiation
    const scanJob = {
      id: `scan-${Date.now()}`,
      type: scanType,
      namespace: namespace || 'all',
      images: images.length > 0 ? images : 'all',
      status: 'running',
      startTime: new Date().toISOString(),
      estimatedDuration: '5-10 minutes',
      progress: 0
    };

    logger.info('Security scan started:', {
      scanJob,
      user: req.user.email
    });

    res.json({
      success: true,
      message: 'Security scan initiated',
      data: scanJob
    });

  } catch (error) {
    logger.error('Start security scan error:', error);
    res.status(500).json({ success: false, error: 'Failed to start security scan' });
  }
});

// ================================
// COMPLIANCE ROUTES
// ================================

// Get compliance overview
router.get('/compliance/overview', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const compliance = {
      overall: {
        score: 78,
        status: 'warning',
        lastAssessment: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        trend: 'improving'
      },
      categories: {
        podSecurity: {
          name: 'Pod Security Standards',
          score: 85,
          status: 'good',
          checks: 12,
          passed: 10,
          failed: 2
        },
        networkSecurity: {
          name: 'Network Security',
          score: 45,
          status: 'critical',
          checks: 8,
          passed: 4,
          failed: 4
        },
        rbac: {
          name: 'RBAC Configuration',
          score: 78,
          status: 'warning',
          checks: 15,
          passed: 12,
          failed: 3
        },
        resourceManagement: {
          name: 'Resource Management',
          score: 88,
          status: 'good',
          checks: 10,
          passed: 9,
          failed: 1
        },
        imageSecurity: {
          name: 'Image Security',
          score: 62,
          status: 'warning',
          checks: 6,
          passed: 4,
          failed: 2
        }
      }
    };

    res.json({ success: true, data: compliance });

  } catch (error) {
    logger.error('Get compliance overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to get compliance overview' });
  }
});

// Get CIS Kubernetes benchmark results
router.get('/compliance/cis-benchmark', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const benchmarkResults = {
      version: 'CIS Kubernetes Benchmark v1.6.1',
      lastRun: new Date(Date.now() - 3600000).toISOString(),
      overallScore: 78,
      sections: {
        masterNodeSecurity: {
          name: 'Master Node Security Configuration',
          score: 82,
          checks: [
            { id: '1.1.1', description: 'Ensure API server pod specification file permissions', status: 'PASS' },
            { id: '1.1.2', description: 'Ensure API server pod specification file ownership', status: 'PASS' },
            { id: '1.2.1', description: 'Ensure anonymous-auth argument is set to false', status: 'FAIL' },
            { id: '1.2.2', description: 'Ensure basic-auth-file argument is not set', status: 'PASS' }
          ]
        },
        etcd: {
          name: 'etcd Node Configuration',
          score: 90,
          checks: [
            { id: '2.1', description: 'Ensure cert-file and key-file arguments are set', status: 'PASS' },
            { id: '2.2', description: 'Ensure client-cert-auth argument is set to true', status: 'PASS' },
            { id: '2.3', description: 'Ensure auto-tls argument is not set to true', status: 'WARN' }
          ]
        },
        controlPlane: {
          name: 'Control Plane Configuration',
          score: 75,
          checks: [
            { id: '3.1.1', description: 'Client certificate authentication should not be used for users', status: 'FAIL' },
            { id: '3.2.1', description: 'Minimize the admission of privileged containers', status: 'PASS' },
            { id: '3.2.2', description: 'Minimize the admission of containers wishing to share the host process ID namespace', status: 'PASS' }
          ]
        },
        workerNodes: {
          name: 'Worker Nodes',
          score: 68,
          checks: [
            { id: '4.1.1', description: 'Ensure kubelet service file permissions', status: 'PASS' },
            { id: '4.1.2', description: 'Ensure kubelet service file ownership', status: 'FAIL' },
            { id: '4.2.1', description: 'Ensure anonymous-auth argument is set to false', status: 'WARN' }
          ]
        }
      }
    };

    res.json({ success: true, data: benchmarkResults });

  } catch (error) {
    logger.error('Get CIS benchmark error:', error);
    res.status(500).json({ success: false, error: 'Failed to get CIS benchmark results' });
  }
});

// Run compliance check
router.post('/compliance/check', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { checkType = 'full', categories = [] } = req.body;
    
    const complianceCheck = {
      id: `compliance-${Date.now()}`,
      type: checkType,
      categories: categories.length > 0 ? categories : 'all',
      status: 'running',
      startTime: new Date().toISOString(),
      estimatedDuration: '10-15 minutes',
      progress: 0
    };

    logger.info('Compliance check started:', {
      check: complianceCheck,
      user: req.user.email
    });

    res.json({
      success: true,
      message: 'Compliance check initiated',
      data: complianceCheck
    });

  } catch (error) {
    logger.error('Start compliance check error:', error);
    res.status(500).json({ success: false, error: 'Failed to start compliance check' });
  }
});

// ================================
// RBAC AUDIT ROUTES
// ================================

// Get RBAC audit results
router.get('/rbac/audit', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { riskLevel } = req.query;
    
    let rbacIssues = [
      {
        id: 'rbac-1',
        type: 'Excessive Permissions',
        subject: 'system:node:worker-1',
        subjectType: 'User',
        permission: 'cluster-admin',
        resource: '*',
        namespace: '*',
        risk: 'critical',
        description: 'Node has cluster-admin permissions which is excessive',
        recommendation: 'Reduce to specific node permissions',
        lastUsed: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: 'rbac-2',
        type: 'Unused Role',
        subject: 'old-developer-role',
        subjectType: 'Role',
        permission: 'pods/create',
        resource: 'pods',
        namespace: 'development',
        risk: 'medium',
        description: 'Role has not been used for over 30 days',
        recommendation: 'Remove unused role to reduce attack surface',
        lastUsed: new Date(Date.now() - 2592000000).toISOString() // 30 days ago
      },
      {
        id: 'rbac-3',
        type: 'Wide ClusterRole',
        subject: 'monitoring-reader',
        subjectType: 'ClusterRole',
        permission: 'get',
        resource: '*',
        namespace: '*',
        risk: 'low',
        description: 'ClusterRole has read access to all resources in all namespaces',
        recommendation: 'Scope to specific namespaces and resources',
        lastUsed: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      }
    ];

    // Filter by risk level if specified
    if (riskLevel && riskLevel !== 'all') {
      rbacIssues = rbacIssues.filter(issue => issue.risk === riskLevel);
    }

    // Sort by risk level
    const riskOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    rbacIssues.sort((a, b) => riskOrder[b.risk] - riskOrder[a.risk]);

    res.json({
      success: true,
      data: rbacIssues,
      summary: {
        total: rbacIssues.length,
        critical: rbacIssues.filter(i => i.risk === 'critical').length,
        high: rbacIssues.filter(i => i.risk === 'high').length,
        medium: rbacIssues.filter(i => i.risk === 'medium').length,
        low: rbacIssues.filter(i => i.risk === 'low').length
      }
    });

  } catch (error) {
    logger.error('Get RBAC audit error:', error);
    res.status(500).json({ success: false, error: 'Failed to get RBAC audit results' });
  }
});

// Get role bindings analysis
router.get('/rbac/bindings', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace } = req.query;
    const { rbacApi, coreApi } = getKubernetesClient();
    
    // Get role bindings
    let roleBindings, clusterRoleBindings;
    
    if (namespace && namespace !== 'all') {
      roleBindings = await rbacApi.listNamespacedRoleBinding(namespace);
      clusterRoleBindings = { body: { items: [] }}; // Don't include cluster bindings for namespace-specific query
    } else {
      [roleBindings, clusterRoleBindings] = await Promise.all([
        rbacApi.listRoleBindingForAllNamespaces(),
        rbacApi.listClusterRoleBinding()
      ]);
    }

    const bindings = [
      ...roleBindings.body.items.map(rb => ({
        name: rb.metadata.name,
        namespace: rb.metadata.namespace,
        type: 'RoleBinding',
        role: rb.roleRef.name,
        roleKind: rb.roleRef.kind,
        subjects: rb.subjects || [],
        creationTimestamp: rb.metadata.creationTimestamp
      })),
      ...clusterRoleBindings.body.items.map(crb => ({
        name: crb.metadata.name,
        namespace: null,
        type: 'ClusterRoleBinding',
        role: crb.roleRef.name,
        roleKind: crb.roleRef.kind,
        subjects: crb.subjects || [],
        creationTimestamp: crb.metadata.creationTimestamp
      }))
    ];

    res.json({ success: true, data: bindings });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Get role bindings');
    logger.error('Get role bindings error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// ================================
// NETWORK POLICIES ROUTES
// ================================

// Get network policies
router.get('/network-policies', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace } = req.query;
    const { networkingApi } = getKubernetesClient();
    
    let networkPolicies;
    if (namespace && namespace !== 'all') {
      networkPolicies = await networkingApi.listNamespacedNetworkPolicy(namespace);
    } else {
      networkPolicies = await networkingApi.listNetworkPolicyForAllNamespaces();
    }

    const policies = networkPolicies.body.items.map(np => ({
      name: np.metadata.name,
      namespace: np.metadata.namespace,
      podSelector: np.spec.podSelector || {},
      policyTypes: np.spec.policyTypes || [],
      ingress: np.spec.ingress || [],
      egress: np.spec.egress || [],
      creationTimestamp: np.metadata.creationTimestamp,
      labels: np.metadata.labels || {}
    }));

    res.json({ success: true, data: policies });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Get network policies');
    logger.error('Get network policies error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// Analyze network policy coverage
router.get('/network-policies/coverage', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const { networkingApi, coreApi } = getKubernetesClient();
    
    const [networkPolicies, pods] = await Promise.all([
      networkingApi.listNamespacedNetworkPolicy(namespace),
      coreApi.listNamespacedPod(namespace)
    ]);

    const analysis = {
      namespace,
      totalPods: pods.body.items.length,
      protectedPods: 0,
      unprotectedPods: 0,
      policies: networkPolicies.body.items.length,
      coverage: {
        ingress: 0,
        egress: 0,
        both: 0,
        none: 0
      }
    };

    // Simplified coverage analysis (in real implementation, this would be more complex)
    pods.body.items.forEach(pod => {
      const hasIngressPolicy = networkPolicies.body.items.some(np => 
        np.spec.policyTypes?.includes('Ingress')
      );
      const hasEgressPolicy = networkPolicies.body.items.some(np => 
        np.spec.policyTypes?.includes('Egress')
      );

      if (hasIngressPolicy && hasEgressPolicy) {
        analysis.coverage.both++;
        analysis.protectedPods++;
      } else if (hasIngressPolicy) {
        analysis.coverage.ingress++;
        analysis.protectedPods++;
      } else if (hasEgressPolicy) {
        analysis.coverage.egress++;
        analysis.protectedPods++;
      } else {
        analysis.coverage.none++;
        analysis.unprotectedPods++;
      }
    });

    res.json({ success: true, data: analysis });

  } catch (error) {
    const k8sError = handleK8sError(error, 'Analyze network policy coverage');
    logger.error('Analyze network policy coverage error:', k8sError);
    res.status(500).json({ success: false, error: k8sError.message });
  }
});

// ================================
// SECURITY REPORTS ROUTES
// ================================

// Generate security report
router.post('/reports/generate', authorize(['admin', 'editor']), async (req, res) => {
  try {
    const { reportType = 'comprehensive', format = 'json', namespaces = [] } = req.body;
    
    const report = {
      id: `report-${Date.now()}`,
      type: reportType,
      format,
      namespaces: namespaces.length > 0 ? namespaces : 'all',
      status: 'generating',
      startTime: new Date().toISOString(),
      sections: [
        'vulnerability-scan',
        'compliance-check',
        'rbac-audit',
        'network-policy-analysis',
        'security-recommendations'
      ],
      estimatedDuration: '5-10 minutes'
    };

    logger.info('Security report generation started:', {
      report,
      user: req.user.email
    });

    res.json({
      success: true,
      message: 'Security report generation initiated',
      data: report
    });

  } catch (error) {
    logger.error('Generate security report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate security report' });
  }
});

// Get security recommendations
router.get('/recommendations', authorize(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const recommendations = [
      {
        id: 'rec-1',
        category: 'Image Security',
        priority: 'high',
        title: 'Update vulnerable base images',
        description: 'Several containers are using base images with known vulnerabilities',
        impact: 'Reduces attack surface and prevents exploitation of known vulnerabilities',
        effort: 'medium',
        steps: [
          'Identify vulnerable images using security scan results',
          'Update Dockerfiles to use latest patched base images',
          'Rebuild and redeploy affected applications',
          'Implement automated image scanning in CI/CD pipeline'
        ],
        affectedResources: ['nginx:1.19', 'alpine:3.12', 'ubuntu:18.04']
      },
      {
        id: 'rec-2',
        category: 'Network Security',
        priority: 'critical',
        title: 'Implement network policies',
        description: 'Most pods lack network policy protection',
        impact: 'Prevents lateral movement and reduces blast radius of potential breaches',
        effort: 'high',
        steps: [
          'Analyze application communication patterns',
          'Design network policies for each application',
          'Implement default deny policies',
          'Test and validate network connectivity'
        ],
        affectedResources: ['default namespace', 'production namespace']
      },
      {
        id: 'rec-3',
        category: 'RBAC',
        priority: 'medium',
        title: 'Review and reduce excessive permissions',
        description: 'Some service accounts have broader permissions than necessary',
        impact: 'Follows principle of least privilege and reduces privilege escalation risks',
        effort: 'low',
        steps: [
          'Audit current role bindings',
          'Identify unused or excessive permissions',
          'Create more specific roles',
          'Update role bindings to use minimal permissions'
        ],
        affectedResources: ['system:node:worker-1', 'old-developer-role']
      }
    ];

    res.json({ success: true, data: recommendations });

  } catch (error) {
    logger.error('Get security recommendations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get security recommendations' });
  }
});

export default router;