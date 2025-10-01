# GrepMind Dashboard - Kubernetes Deployment Guide

## Overview
This guide covers the complete Kubernetes deployment of the GrepMind Dashboard using Helm charts and Docker image management.

## Architecture
- **Frontend**: React 18 + Vite served by Nginx
- **Backend**: Node.js + Express + Prisma + WebSocket
- **Database**: PostgreSQL with NFS persistent storage
- **Cache**: Redis with NFS persistent storage
- **Ingress**: Nginx Ingress Controller for external access

## Prerequisites

### Required Tools
```bash
# Install Helm
curl https://get.helm.sh/helm-v3.13.0-linux-amd64.tar.gz | tar -xz
sudo mv linux-amd64/helm /usr/local/bin/

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/

# Verify installations
helm version
kubectl version --client
```

### NFS Server Setup
Ensure your NFS server (10.0.0.20) has the required directories:
```bash
# On NFS server (10.0.0.20)
sudo mkdir -p /srv/nfs/kubedata/postgres
sudo mkdir -p /srv/nfs/kubedata/redis
sudo chown -R nobody:nogroup /srv/nfs/kubedata
sudo chmod -R 755 /srv/nfs/kubedata

# Verify NFS exports
sudo exportfs -ra
showmount -e localhost
```

### Kubernetes Cluster Requirements
- Kubernetes cluster with NFS CSI driver
- Nginx Ingress Controller installed
- Metrics Server for HPA functionality

## Docker Image Management

### Build and Push Images
```bash
# Set registry configuration (adjust as needed)
export REGISTRY=docker.io
export NAMESPACE=grepmind
export TAG=latest

# Login to your registry
make login

# Build all images
make build-all

# Validate image functionality
make validate-all

# Push images to registry
make push-all

# Complete workflow (build + validate + push)
make deploy-prep
```

### Registry Configuration Options
```bash
# For Docker Hub (default)
make build-and-push-all REGISTRY=docker.io NAMESPACE=yourusername

# For private registry
make build-and-push-all REGISTRY=your-registry.com NAMESPACE=yourproject

# For specific tag
make build-and-push-all TAG=v1.0.0

# For development
make dev-build  # Uses TAG=dev
```

### Multi-Architecture Builds
```bash
# Setup buildx for ARM64/AMD64 support
make buildx-setup

# Build and push multi-arch images
make buildx-all
```

## Helm Chart Deployment

### 1. Deploy Infrastructure (PostgreSQL + Redis)
```bash
# Create namespace
kubectl create namespace grepmind

# Deploy infrastructure components
helm install grepmind-infra helm/grepmind-infrastructure \
  --namespace grepmind \
  --set global.nfsServer=10.0.0.20 \
  --set postgresql.auth.postgresPassword=postgres123 \
  --set postgresql.auth.password=grepmind123

# Verify infrastructure deployment
kubectl get pods -n grepmind -l component=postgres
kubectl get pods -n grepmind -l component=redis
kubectl get pv,pvc -n grepmind
```

### 2. Deploy Backend
```bash
# Deploy backend service
helm install grepmind-backend helm/grepmind-backend \
  --namespace grepmind \
  --set image.repository=grepmind/backend \
  --set image.tag=latest \
  --wait

# Verify backend deployment
kubectl get pods -n grepmind -l app.kubernetes.io/name=grepmind-backend
kubectl logs -n grepmind -l app.kubernetes.io/name=grepmind-backend
```

### 3. Deploy Frontend
```bash
# Deploy frontend service
helm install grepmind-frontend helm/grepmind-frontend \
  --namespace grepmind \
  --set image.repository=grepmind/frontend \
  --set image.tag=latest \
  --set ingress.hosts[0].host=grepmind.local

# Verify frontend deployment
kubectl get pods -n grepmind -l app.kubernetes.io/name=grepmind-frontend
kubectl get ingress -n grepmind
```

## Configuration Customization

### Infrastructure Chart Values
```yaml
# custom-infra-values.yaml
global:
  nfsServer: "10.0.0.20"

postgresql:
  auth:
    postgresPassword: "secure-postgres-password"
    username: "grepmind"
    password: "secure-grepmind-password"
    database: "grepmind_db"
  persistence:
    size: 20Gi

redis:
  persistence:
    size: 10Gi
```

### Backend Chart Values
```yaml
# custom-backend-values.yaml
replicaCount: 3

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 1000m
    memory: 1Gi

env:
  - name: NODE_ENV
    value: "production"
  - name: LOG_LEVEL
    value: "info"

secrets:
  data:
    DATABASE_URL: "postgresql://grepmind:secure-password@grepmind-postgres:5432/grepmind_db"
    JWT_SECRET: "your-production-jwt-secret-key"
```

### Frontend Chart Values
```yaml
# custom-frontend-values.yaml
replicaCount: 3

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: grepmind.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: grepmind-tls
      hosts:
        - grepmind.yourdomain.com
```

## Deployment with Custom Values
```bash
# Deploy with custom configurations
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

## Monitoring and Maintenance

### Check Deployment Status
```bash
# Overall cluster status
kubectl get all -n grepmind

# Check persistent volumes
kubectl get pv,pvc -n grepmind

# Check ingress and services
kubectl get ingress,svc -n grepmind

# Check HPA status
kubectl get hpa -n grepmind
```

### View Logs
```bash
# Backend logs
kubectl logs -n grepmind -l app.kubernetes.io/name=grepmind-backend -f

# Frontend logs  
kubectl logs -n grepmind -l app.kubernetes.io/name=grepmind-frontend -f

# Database logs
kubectl logs -n grepmind -l component=postgres -f

# Redis logs
kubectl logs -n grepmind -l component=redis -f
```

### Scaling Applications
```bash
# Manual scaling
kubectl scale deployment grepmind-backend -n grepmind --replicas=5
kubectl scale deployment grepmind-frontend -n grepmind --replicas=3

# Update HPA settings
helm upgrade grepmind-backend helm/grepmind-backend \
  --namespace grepmind \
  --set autoscaling.minReplicas=3 \
  --set autoscaling.maxReplicas=10
```

## Upgrades and Updates

### Update Application Images
```bash
# Build new version
make build-and-push-all TAG=v1.1.0

# Upgrade backend
helm upgrade grepmind-backend helm/grepmind-backend \
  --namespace grepmind \
  --set image.tag=v1.1.0

# Upgrade frontend
helm upgrade grepmind-frontend helm/grepmind-frontend \
  --namespace grepmind \
  --set image.tag=v1.1.0
```

### Database Migrations
```bash
# Manual migration job (if needed)
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: grepmind-migration-manual
  namespace: grepmind
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: grepmind/backend:latest
        command: ["npx", "prisma", "migrate", "deploy"]
        env:
        - name: DATABASE_URL
          value: "postgresql://grepmind:grepmind123@grepmind-postgres:5432/grepmind_db"
EOF
```

## Troubleshooting

### Common Issues
1. **NFS Mount Failures**: Verify NFS server accessibility and exports
2. **Image Pull Errors**: Check registry authentication and image availability
3. **Database Connection Issues**: Verify PostgreSQL pod status and service endpoints
4. **Ingress Not Working**: Check ingress controller status and DNS resolution

### Debug Commands
```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n grepmind

# Describe problematic pods
kubectl describe pod <pod-name> -n grepmind

# Check events
kubectl get events -n grepmind --sort-by='.lastTimestamp'

# Test connectivity
kubectl run test-pod --image=busybox -n grepmind --rm -it -- sh
# Inside pod: nslookup grepmind-postgres
```

## Cleanup

### Remove All Components
```bash
# Delete Helm releases
helm uninstall grepmind-frontend -n grepmind
helm uninstall grepmind-backend -n grepmind
helm uninstall grepmind-infra -n grepmind

# Delete namespace (this removes all resources)
kubectl delete namespace grepmind

# Clean up persistent volumes (if needed)
kubectl delete pv grepmind-infra-postgres-pv
kubectl delete pv grepmind-infra-redis-pv
```

### Clean Local Images
```bash
# Remove local Docker images
make clean-images

# Complete system cleanup
make clean-all
```

## Security Considerations

### Production Recommendations
1. **Use proper secrets management** (HashiCorp Vault, Kubernetes Secrets)
2. **Enable TLS/SSL** with proper certificates
3. **Configure network policies** for pod-to-pod communication
4. **Use non-root containers** (already configured)
5. **Regular security updates** for base images
6. **Resource limits and quotas** (configured in values)

### Sample Network Policy
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: grepmind-network-policy
  namespace: grepmind
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to: []
```

This completes the comprehensive Kubernetes deployment setup for GrepMind Dashboard!