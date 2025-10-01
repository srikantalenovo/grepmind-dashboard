# GrepMind Dashboard - Kubernetes Deployment

A comprehensive Kubernetes dashboard for monitoring and managing containerized applications with Helm chart deployment and Docker image management.

## 🚀 Quick Start

### Prerequisites
- Kubernetes cluster with NFS support
- Helm 3.x installed
- Docker registry access
- NFS server at 10.0.0.20

### Deploy in 5 Minutes
```bash
# 1. Build and push images
make build-and-push-all REGISTRY=your-registry NAMESPACE=your-namespace

# 2. Deploy infrastructure
helm install grepmind-infra helm/grepmind-infrastructure --namespace grepmind --create-namespace

# 3. Deploy backend
helm install grepmind-backend helm/grepmind-backend --namespace grepmind

# 4. Deploy frontend
helm install grepmind-frontend helm/grepmind-frontend --namespace grepmind
```

## 📁 Project Structure

```
grepmind-dashboard/
├── helm/                           # Helm charts directory
│   ├── grepmind-infrastructure/    # PostgreSQL + Redis with NFS
│   ├── grepmind-frontend/          # React frontend chart
│   └── grepmind-backend/           # Node.js backend chart
├── frontend/                       # React application
├── backend/                        # Node.js API server
├── Makefile                        # Docker image management
└── KUBERNETES_DEPLOYMENT.md       # Complete deployment guide
```

## 🛠 Helm Charts

### 1. Infrastructure Chart (`grepmind-infrastructure`)
- **PostgreSQL**: Database with NFS persistent volume
- **Redis**: Cache with NFS persistent volume  
- **NFS Storage Class**: For persistent data
- **Path**: `/srv/nfs/kubedata/postgres`, `/srv/nfs/kubedata/redis`

### 2. Frontend Chart (`grepmind-frontend`)
- **React 18**: Modern frontend with Vite build system
- **Nginx**: Production web server
- **Ingress**: External access configuration
- **HPA**: Auto-scaling based on CPU/Memory

### 3. Backend Chart (`grepmind-backend`)
- **Node.js**: Express API server with WebSocket support
- **Prisma**: Database ORM with migration support
- **Secrets**: Secure configuration management
- **HPA**: Auto-scaling capabilities

## 🐳 Docker Image Management

### Makefile Targets
```bash
# Build images
make build-all                    # Build frontend and backend
make build-frontend              # Build frontend only
make build-backend               # Build backend only

# Push to registry
make push-all                    # Push all images
make login                       # Login to registry
make deploy-prep                 # Complete build + validate + push

# Validation
make validate-all                # Test image functionality
make test-build                  # Build and validate

# Multi-architecture
make buildx-all                  # Build ARM64 + AMD64 images

# Management
make list-images                 # Show local images
make clean-images                # Remove local images
make registry-info               # Show configuration
```

### Registry Configuration
```bash
# Docker Hub
make build-and-push-all REGISTRY=docker.io NAMESPACE=yourusername

# Private Registry  
make build-and-push-all REGISTRY=your-registry.com NAMESPACE=yourproject

# Custom Tag
make build-and-push-all TAG=v1.0.0
```

## ⚙️ Configuration

### NFS Server Requirements
```bash
# On NFS server (10.0.0.20)
sudo mkdir -p /srv/nfs/kubedata/{postgres,redis}
sudo chown -R nobody:nogroup /srv/nfs/kubedata
sudo chmod -R 755 /srv/nfs/kubedata
```

### Custom Values Example
```yaml
# custom-values.yaml
postgresql:
  auth:
    postgresPassword: "secure-password"
  persistence:
    size: 20Gi

backend:
  replicaCount: 3
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi

frontend:
  ingress:
    hosts:
      - host: grepmind.yourdomain.com
```

## 🔧 Deployment Commands

### Complete Deployment
```bash
# Create namespace
kubectl create namespace grepmind

# Deploy with custom values
helm install grepmind-infra helm/grepmind-infrastructure \
  --namespace grepmind \
  --values custom-infra-values.yaml

helm install grepmind-backend helm/grepmind-backend \
  --namespace grepmind \
  --values custom-backend-values.yaml

helm install grepmind-frontend helm/grepmind-frontend \
  --namespace grepmind \
  --values custom-frontend-values.yaml
```

### Monitoring
```bash
# Check status
kubectl get all -n grepmind

# View logs
kubectl logs -n grepmind -l app.kubernetes.io/name=grepmind-backend -f

# Check scaling
kubectl get hpa -n grepmind
```

## 🎯 Features

### Infrastructure
- ✅ NFS persistent storage for PostgreSQL and Redis
- ✅ Automatic volume provisioning and binding
- ✅ Production-ready database configuration
- ✅ Redis caching with persistence

### Application
- ✅ React 18 frontend with modern tooling
- ✅ Node.js backend with Express and Prisma
- ✅ WebSocket support for real-time features
- ✅ Database migrations with Helm hooks
- ✅ Horizontal Pod Autoscaling (HPA)

### DevOps
- ✅ Multi-stage Docker builds for optimization
- ✅ Security hardening (non-root containers)
- ✅ Health checks and readiness probes
- ✅ Ingress configuration for external access
- ✅ Secrets management for sensitive data

## 📚 Documentation

- **[KUBERNETES_DEPLOYMENT.md](KUBERNETES_DEPLOYMENT.md)** - Complete deployment guide
- **[FINAL_BUILD_FIXES.md](FINAL_BUILD_FIXES.md)** - Build issue resolutions
- **Individual Chart READMEs** - Component-specific documentation

## 🔐 Security

### Production Recommendations
- Use proper secrets management (Vault, K8s Secrets)
- Enable TLS/SSL with valid certificates
- Configure network policies for pod communication
- Regular security updates for base images
- Resource limits and quotas (pre-configured)

### Sample Production Values
```yaml
# production-values.yaml
frontend:
  ingress:
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
    tls:
      - secretName: grepmind-tls
        hosts:
          - grepmind.yourdomain.com

backend:
  secrets:
    data:
      JWT_SECRET: "production-jwt-secret"
      DATABASE_URL: "postgresql://user:secure-pass@host:5432/db"
```

## 🚀 Quick Development Workflow

1. **Make changes** to frontend/backend code
2. **Build new images**: `make build-all TAG=dev`
3. **Push to registry**: `make push-all TAG=dev`
4. **Upgrade deployment**: 
   ```bash
   helm upgrade grepmind-backend helm/grepmind-backend --set image.tag=dev
   helm upgrade grepmind-frontend helm/grepmind-frontend --set image.tag=dev
   ```

## 📞 Support

For issues and questions:
- Check the troubleshooting section in `KUBERNETES_DEPLOYMENT.md`
- Review pod logs: `kubectl logs -n grepmind <pod-name>`
- Validate configuration: `helm template <chart> --debug`

---

**Ready to deploy? Start with `make deploy-prep` and follow the [deployment guide](KUBERNETES_DEPLOYMENT.md)!** 🎉