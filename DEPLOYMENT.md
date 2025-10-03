# GrepMind Dashboard - Kubernetes Deployment

A comprehensive Kubernetes resource monitoring dashboard built with React, Node.js, and PostgreSQL.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (React)       │    │   (Node.js)     │    │   (Database)    │
│   Port: 80      │────│   Port: 3001    │────│   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────────────────────────────────────────────────────────┐
    │               NGINX Ingress Controller                     │
    │           dashboard.grepmind.com                           │
    └─────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### Required Tools
- Docker (for building images)
- Kubernetes cluster (v1.20+)
- Helm 3.x
- kubectl configured for your cluster
- NGINX Ingress Controller installed

### Infrastructure Requirements
- **NFS Server**: `10.0.0.20` with path `/srv/nfs/kubedata/postgres`
- **Domain**: `dashboard.grepmind.com` (configure DNS to point to your cluster)
- **Docker Registry**: DockerHub account `srikanta1219`

## 🚀 Quick Deployment

### 1. Prepare Your Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd grepmind-dashboard

# Make deployment script executable
chmod +x deploy.sh

# Login to Docker Hub
docker login
```

### 2. One-Command Deployment

```bash
# Deploy everything (builds, pushes, and deploys)
./deploy.sh
```

### 3. Manual Step-by-Step Deployment

```bash
# Step 1: Build Docker images
./deploy.sh build

# Step 2: Push images to registry
./deploy.sh push

# Step 3: Deploy to Kubernetes
./deploy.sh deploy
```

## 🔧 Configuration

### Production Deployment

For production, use the production values file:

```bash
# Deploy with production configuration
helm upgrade --install grepmind-dashboard ./helm \
  --namespace grepmind-dashboard \
  --create-namespace \
  --values ./helm/values-production.yaml \
  --wait
```

### Custom Configuration

Create your own values file:

```yaml
# values-custom.yaml
global:
  domain: "your-domain.com"
  imageRegistry: "your-registry"

postgresql:
  persistence:
    nfs:
      server: "your-nfs-server"
      path: "/your/nfs/path"

backend:
  env:
    JWT_SECRET: "your-jwt-secret"
    CORS_ORIGIN: "http://your-domain.com"

frontend:
  env:
    VITE_API_BASE_URL: "http://your-domain.com/api"
```

## 🔍 Monitoring & Management

### Check Deployment Status

```bash
# View all resources
./deploy.sh status

# Check specific components
kubectl get pods -n default -l app.kubernetes.io/part-of=grepmind-dashboard
kubectl get services -n default -l app.kubernetes.io/part-of=grepmind-dashboard
kubectl get ingress -n default
```

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/grepmind-dashboard-backend -n default

# Frontend logs
kubectl logs -f deployment/grepmind-dashboard-frontend -n default

# PostgreSQL logs
kubectl logs -f deployment/grepmind-dashboard-postgresql -n default
```

### Access the Application

- **Web Interface**: http://dashboard.grepmind.com/
- **API Health Check**: http://dashboard.grepmind.com/api/health
- **API Documentation**: http://dashboard.grepmind.com/api/docs (if available)

## 🛠️ Maintenance

### Update Application

```bash
# Rebuild and redeploy
./deploy.sh build
./deploy.sh push
./deploy.sh deploy
```

### Scale Services

```bash
# Scale backend replicas
kubectl scale deployment grepmind-dashboard-backend --replicas=5 -n default

# Scale frontend replicas
kubectl scale deployment grepmind-dashboard-frontend --replicas=3 -n default
```

### Database Operations

```bash
# Connect to PostgreSQL
kubectl exec -it deployment/grepmind-dashboard-postgresql -n default -- psql -U grepmind_user -d grepmind_dashboard

# Backup database
kubectl exec deployment/grepmind-dashboard-postgresql -n default -- pg_dump -U grepmind_user grepmind_dashboard > backup.sql

# Restore database
kubectl exec -i deployment/grepmind-dashboard-postgresql -n default -- psql -U grepmind_user grepmind_dashboard < backup.sql
```

## 🔒 Security

### Default Credentials

**⚠️ IMPORTANT: Change these in production!**

- **PostgreSQL Admin**: `postgres` / `postgres123!@#`
- **PostgreSQL App User**: `grepmind_user` / `grepmind_pass123!@#`
- **Default Admin User**: Created on first startup (check backend logs)

### RBAC Permissions

The backend service account has read-only access to:
- Pods, Services, Endpoints
- Deployments, ReplicaSets, DaemonSets, StatefulSets
- ConfigMaps, Secrets (values masked)
- Ingresses, Namespaces, Nodes
- Pod logs

## 🐛 Troubleshooting

### Common Issues

1. **NFS Mount Issues**
   ```bash
   # Check NFS connectivity
   kubectl run nfs-test --image=busybox --restart=Never -- sh -c "mount -t nfs 10.0.0.20:/srv/nfs/kubedata/postgres /mnt && ls -la /mnt"
   ```

2. **Ingress Not Working**
   ```bash
   # Check NGINX Ingress Controller
   kubectl get pods -n ingress-nginx
   kubectl describe ingress grepmind-dashboard-frontend -n default
   ```

3. **Database Connection Issues**
   ```bash
   # Test database connectivity
   kubectl run pg-test --image=postgres:15-alpine --restart=Never -- psql postgresql://grepmind_user:grepmind_pass123!@#@grepmind-dashboard-postgresql:5432/grepmind_dashboard -c "SELECT 1;"
   ```

4. **Image Pull Issues**
   ```bash
   # Check if images exist
   docker pull srikanta1219/grepmind-dashboard-backend:latest
   docker pull srikanta1219/grepmind-dashboard-frontend:latest
   ```

### Emergency Recovery

```bash
# Complete cleanup and redeploy
./deploy.sh clean
./deploy.sh
```

## 🔄 Backup & Recovery

### Data Backup

```bash
# Create backup script
kubectl create configmap backup-script --from-file=backup.sh

# Schedule regular backups (CronJob)
kubectl apply -f k8s/backup-cronjob.yaml
```

### Disaster Recovery

1. **Backup NFS data regularly**
2. **Export Helm values**
3. **Store Docker images in multiple registries**
4. **Document DNS configuration**

## 📊 Performance Tuning

### Resource Limits

- **PostgreSQL**: 1-2 CPU cores, 1-2GB RAM
- **Backend**: 0.5-2 CPU cores, 0.5-2GB RAM
- **Frontend**: 0.25-1 CPU cores, 256MB-1GB RAM

### Scaling Guidelines

- **Low Traffic**: 1 replica each
- **Medium Traffic**: 2-3 replicas each
- **High Traffic**: Enable HPA with 3-10 replicas

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [PostgreSQL on Kubernetes](https://postgres-operator.readthedocs.io/)

---

**Support**: For issues and questions, please check the troubleshooting section or create an issue in the repository.
