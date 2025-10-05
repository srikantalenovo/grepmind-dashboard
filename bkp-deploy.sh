#!/bin/bash

# GrepMind Dashboard Deployment Script
# This script builds and deploys the GrepMind Dashboard to Kubernetes

set -e

# Configuration
DOCKER_REGISTRY="srikanta1219"
APP_NAME="grepmind-dashboard"
NAMESPACE="default"
HELM_RELEASE_NAME="grepmind-dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command_exists docker; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists helm; then
        error "Helm is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists kubectl; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build backend image
    log "Building backend image..."
    cd backend
    docker build -t ${DOCKER_REGISTRY}/${APP_NAME}-backend:latest .
    cd ..
    
    # Build frontend image
    log "Building frontend image..."
    cd frontend
    docker build -t ${DOCKER_REGISTRY}/${APP_NAME}-frontend:latest .
    cd ..
    
    success "Docker images built successfully"
}

# Push Docker images
push_images() {
    log "Pushing Docker images to registry..."
    
    # Login to Docker Hub (you may need to run 'docker login' manually first)
    log "Pushing backend image..."
    docker push ${DOCKER_REGISTRY}/${APP_NAME}-backend:latest
    
    log "Pushing frontend image..."
    docker push ${DOCKER_REGISTRY}/${APP_NAME}-frontend:latest
    
    success "Docker images pushed successfully"
}

# Setup NFS storage class if it doesn't exist
setup_nfs_storage() {
    log "Setting up NFS storage class..."
    
    if kubectl get storageclass nfs-storage >/dev/null 2>&1; then
        warn "NFS storage class already exists, skipping creation"
    else
        log "Creating NFS storage class..."
        kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
EOF
        success "NFS storage class created"
    fi
}

# Deploy using Helm
deploy_helm() {
    log "Deploying with Helm..."
    
    # Deploy PostgreSQL first
    log "Deploying PostgreSQL..."
    helm upgrade --install ${HELM_RELEASE_NAME}-postgresql ./helm/postgresql \
        --namespace ${NAMESPACE} \
        --create-namespace \
        --wait
    
    # Wait for PostgreSQL to be ready
    log "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grepmind-dashboard-postgresql \
        --namespace=${NAMESPACE} --timeout=300s
    
    # Deploy Backend
    log "Deploying Backend..."
    helm upgrade --install ${HELM_RELEASE_NAME}-backend ./helm/backend \
        --namespace ${NAMESPACE} \
        --create-namespace \
        --wait
    
    # Wait for Backend to be ready
    log "Waiting for Backend to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grepmind-dashboard-backend \
        --namespace=${NAMESPACE} --timeout=300s
    
    # Deploy Frontend
    log "Deploying Frontend..."
    helm upgrade --install ${HELM_RELEASE_NAME}-frontend ./helm/frontend \
        --namespace ${NAMESPACE} \
        --create-namespace \
        --wait
    
    success "Deployment completed successfully"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    
    echo "\n--- Pods ---"
    kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/part-of=grepmind-dashboard
    
    echo "\n--- Services ---"
    kubectl get services -n ${NAMESPACE} -l app.kubernetes.io/part-of=grepmind-dashboard
    
    echo "\n--- Ingress ---"
    kubectl get ingress -n ${NAMESPACE}
    
    echo "\n--- Persistent Volumes ---"
    kubectl get pv,pvc -n ${NAMESPACE}
    
    echo "\n🚀 Application should be available at: http://dashboard.grepmind.com/"
    echo "\n📊 To view logs:"
    echo "   Backend:  kubectl logs -f deployment/${HELM_RELEASE_NAME}-backend -n ${NAMESPACE}"
    echo "   Frontend: kubectl logs -f deployment/${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE}"
    echo "   PostgreSQL: kubectl logs -f deployment/${HELM_RELEASE_NAME}-postgresql -n ${NAMESPACE}"
}

# Main execution
main() {
    log "Starting GrepMind Dashboard deployment..."
    
    check_prerequisites
    setup_nfs_storage
    build_images
    push_images
    deploy_helm
    show_status
    
    success "🎉 GrepMind Dashboard deployment completed!"
}

# Handle script arguments
case "${1:-}" in
    "build")
        check_prerequisites
        build_images
        ;;
    "push")
        check_prerequisites
        push_images
        ;;
    "deploy")
        check_prerequisites
        setup_nfs_storage
        deploy_helm
        show_status
        ;;
    "status")
        show_status
        ;;
    "clean")
        log "Uninstalling GrepMind Dashboard..."
        helm uninstall ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} || true
        helm uninstall ${HELM_RELEASE_NAME}-backend -n ${NAMESPACE} || true
        helm uninstall ${HELM_RELEASE_NAME}-postgresql -n ${NAMESPACE} || true
        success "Cleanup completed"
        ;;
    *)
        main
        ;;
esac
