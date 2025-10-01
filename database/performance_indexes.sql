-- Migration to add additional indexes for performance
-- Run this after Prisma migrations are complete

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users (email, "isActive");
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users ("lastLoginAt" DESC) WHERE "lastLoginAt" IS NOT NULL;

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens ("expiresAt");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens ("userId");

-- Kubernetes resources indexes
CREATE INDEX IF NOT EXISTS idx_k8s_namespaces_cluster ON kubernetes_namespaces ("clusterId");
CREATE INDEX IF NOT EXISTS idx_k8s_pods_namespace_status ON kubernetes_pods ("namespaceId", status);
CREATE INDEX IF NOT EXISTS idx_k8s_pods_node ON kubernetes_pods ("nodeId") WHERE "nodeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_k8s_deployments_namespace ON kubernetes_deployments ("namespaceId");
CREATE INDEX IF NOT EXISTS idx_k8s_services_namespace ON kubernetes_services ("namespaceId");
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_cluster ON kubernetes_nodes ("clusterId");

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_cluster_metrics_timestamp ON cluster_metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cluster_metrics_cluster_time ON cluster_metrics ("clusterId", timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_node_metrics_timestamp ON node_metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_node_metrics_node_time ON node_metrics ("nodeId", timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pod_metrics_timestamp ON pod_metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pod_metrics_pod_time ON pod_metrics ("podId", timestamp DESC);

-- Events and alerts indexes
CREATE INDEX IF NOT EXISTS idx_cluster_events_timestamp ON cluster_events ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_cluster_events_cluster_time ON cluster_events ("clusterId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_cluster_events_severity ON cluster_events (severity);
CREATE INDEX IF NOT EXISTS idx_cluster_events_namespace ON cluster_events (namespace);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_rule_time ON alerts ("ruleId", "createdAt" DESC);

-- Dashboard indexes
CREATE INDEX IF NOT EXISTS idx_dashboards_user ON metrics_dashboards ("userId");
CREATE INDEX IF NOT EXISTS idx_dashboards_public ON metrics_dashboards ("isPublic") WHERE "isPublic" = true;
CREATE INDEX IF NOT EXISTS idx_panels_dashboard ON metrics_panels ("dashboardId");

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs ("userId", "createdAt" DESC) WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs ("createdAt" DESC);

-- Full-text search indexes (using pg_trgm extension)
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin (("firstName" || ' ' || "lastName" || ' ' || username) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_search ON cluster_events USING gin ((message || ' ' || reason) gin_trgm_ops);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pods_namespace_status_created ON kubernetes_pods ("namespaceId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_events_cluster_severity_time ON cluster_events ("clusterId", severity, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_cluster_timestamp ON cluster_metrics ("clusterId", timestamp DESC);

RAISE NOTICE 'Performance indexes created successfully!';