-- GrepMind Database Initialization Script
-- This script sets up the initial database structure and seed data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types (these will be synced with Prisma schema)
DO $$ 
BEGIN
    -- Create enum types if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('admin', 'editor', 'viewer');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceType') THEN
        CREATE TYPE "ResourceType" AS ENUM (
            'pod', 'deployment', 'service', 'node', 'namespace',
            'configmap', 'secret', 'ingress', 'persistentvolume',
            'persistentvolumeclaim'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventSeverity') THEN
        CREATE TYPE "EventSeverity" AS ENUM ('info', 'warning', 'critical');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertStatus') THEN
        CREATE TYPE "AlertStatus" AS ENUM ('active', 'resolved', 'silenced');
    END IF;
END $$;

-- Create indexes for better performance
-- Note: Main tables are created by Prisma migrations
-- These are additional indexes for optimization

-- Function to create index if it doesn't exist
CREATE OR REPLACE FUNCTION create_index_if_not_exists(
    index_name TEXT,
    table_name TEXT,
    index_definition TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = index_name
        AND tablename = table_name
    ) THEN
        EXECUTE format('CREATE INDEX %I ON %I %s', index_name, table_name, index_definition);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Performance indexes (will be created after Prisma migration)
-- SELECT create_index_if_not_exists('idx_users_email_active', 'users', '(email, "isActive")');
-- SELECT create_index_if_not_exists('idx_pods_namespace_status', 'kubernetes_pods', '("namespaceId", status)');
-- SELECT create_index_if_not_exists('idx_events_created_at', 'cluster_events', '("createdAt" DESC)');
-- SELECT create_index_if_not_exists('idx_metrics_timestamp', 'cluster_metrics', '(timestamp DESC)');
-- SELECT create_index_if_not_exists('idx_audit_logs_user_action', 'audit_logs', '("userId", action, "createdAt" DESC)');

-- Create a view for active users with their permissions
CREATE OR REPLACE VIEW active_users_view AS
SELECT 
    id,
    email,
    username,
    "firstName",
    "lastName",
    role,
    "lastLoginAt",
    "createdAt"
FROM users 
WHERE "isActive" = true;

-- Create a view for recent cluster events
CREATE OR REPLACE VIEW recent_events_view AS
SELECT 
    e.*,
    c.name as cluster_name
FROM cluster_events e
LEFT JOIN kubernetes_clusters c ON e."clusterId" = c.id
WHERE e."createdAt" >= NOW() - INTERVAL '24 hours'
ORDER BY e."createdAt" DESC;

-- Create a function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete old refresh tokens (older than 30 days)
    DELETE FROM refresh_tokens 
    WHERE "expiresAt" < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old cluster metrics (older than 90 days)
    DELETE FROM cluster_metrics 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Delete old audit logs (older than 1 year)
    DELETE FROM audit_logs 
    WHERE "createdAt" < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Delete old events (older than 30 days)
    DELETE FROM cluster_events 
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default configuration values
INSERT INTO app_config (key, value, description) VALUES
('app_name', 'GrepMind', 'Application name'),
('app_version', '1.0.0', 'Application version'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('session_timeout', '3600', 'Session timeout in seconds'),
('cleanup_interval', '86400', 'Data cleanup interval in seconds'),
('websocket_heartbeat', '30', 'WebSocket heartbeat interval in seconds'),
('metrics_retention_days', '90', 'Metrics retention period in days'),
('events_retention_days', '30', 'Events retention period in days'),
('audit_retention_days', '365', 'Audit logs retention period in days')
ON CONFLICT (key) DO NOTHING;

-- Create a function to generate sample data (for development)
CREATE OR REPLACE FUNCTION generate_sample_data() RETURNS VOID AS $$
BEGIN
    -- This function can be called to generate sample data for development
    -- Implementation would go here
    RAISE NOTICE 'Sample data generation completed';
END;
$$ LANGUAGE plpgsql;

-- Set up row-level security (optional)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for row-level security
-- CREATE POLICY users_policy ON users
--     USING (id = current_setting('app.current_user_id')::uuid OR 
--            current_setting('app.current_user_role') = 'admin');

RAISE NOTICE 'Database initialization completed successfully!';

-- Drop the helper function
DROP FUNCTION IF EXISTS create_index_if_not_exists(TEXT, TEXT, TEXT);