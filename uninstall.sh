#!/bin/bash

# Uninstall GrepMind Dashboard
# This script removes all components of the GrepMind Dashboard from Kubernetes

set -e

# Configuration
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

# Confirm uninstall
confirm_uninstall() {
    echo -e "${RED}⚠️  WARNING: This will completely remove GrepMind Dashboard!${NC}"
    echo -e "${RED}⚠️  This includes all data in PostgreSQL database!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Uninstall cancelled"
        exit 0
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command_exists helm; then
        error "Helm is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists kubectl; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Backup database before uninstall
backup_database() {
    log "Creating database backup before uninstall..."
    
    # Check if PostgreSQL pod exists
    if kubectl get pod -l app.kubernetes.io/name=grepmind-dashboard-postgresql -n ${NAMESPACE} >/dev/null 2>&1; then
        log "Creating database backup..."
        
        # Create backup directory
        mkdir -p ./backups/$(date +%Y%m%d_%H%M%S)
        
        # Backup database
        kubectl exec deployment/${HELM_RELEASE_NAME}-postgresql -n ${NAMESPACE} -- \
            pg_dump -U grepmind_user grepmind_dashboard > "./backups/$(date +%Y%m%d_%H%M%S)/database_backup.sql" || warn "Database backup failed"
        
        success "Database backup created in ./backups/"
    else
        warn "PostgreSQL pod not found, skipping backup"
    fi
}

# Uninstall Helm releases
uninstall_helm_releases() {
    log "Uninstalling Helm releases..."
    
    # List of releases to uninstall
    releases=("${HELM_RELEASE_NAME}-frontend" "${HELM_RELEASE_NAME}-backend" "${HELM_RELEASE_NAME}-postgresql")
    
    for release in "${releases[@]}"; do
        if helm list -n ${NAMESPACE} | grep -q "^$release"; then
            log "Uninstalling $release..."
            helm uninstall $release -n ${NAMESPACE} || warn "Failed to uninstall $release"
        else
            warn "Release $release not found"
        fi
    done
    
    success "Helm releases uninstalled"
}

# Remove persistent volumes and claims
remove_storage() {
    log "Removing persistent storage..."
    
    # Remove PVCs
    kubectl delete pvc -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE} || warn "Failed to delete PVCs"
    
    # Remove PVs (if they exist)
    kubectl delete pv -l app.kubernetes.io/part-of=grepmind-dashboard || warn "Failed to delete PVs"
    
    success "Persistent storage removed"
}

# Remove RBAC resources
remove_rbac() {
    log "Removing RBAC resources..."
    
    # Remove ClusterRoleBindings
    kubectl delete clusterrolebinding -l app.kubernetes.io/part-of=grepmind-dashboard || warn "Failed to delete ClusterRoleBindings"
    
    # Remove ClusterRoles
    kubectl delete clusterrole -l app.kubernetes.io/part-of=grepmind-dashboard || warn "Failed to delete ClusterRoles"
    
    success "RBAC resources removed"
}

# Remove any leftover resources
cleanup_leftover_resources() {
    log "Cleaning up any leftover resources..."
    
    # Remove any remaining resources with the label
    kubectl delete all -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE} || warn "Failed to delete remaining resources"
    
    # Remove secrets
    kubectl delete secrets -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE} || warn "Failed to delete secrets"
    
    # Remove configmaps
    kubectl delete configmaps -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE} || warn "Failed to delete configmaps"
    
    success "Leftover resources cleaned up"
}

# Remove storage class (optional)
remove_storage_class() {
    read -p "Do you want to remove the NFS storage class? (y/N): " remove_sc
    
    if [ "$remove_sc" = "y" ] || [ "$remove_sc" = "Y" ]; then
        log "Removing NFS storage class..."
        kubectl delete storageclass nfs-storage || warn "Failed to delete storage class"
        success "Storage class removed"
    else
        log "Keeping NFS storage class"
    fi
}

# Show final status
show_final_status() {
    log "Final cleanup status:"
    
    echo "\n--- Remaining Pods ---"
    kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/part-of=grepmind-dashboard || true
    
    echo "\n--- Remaining Services ---"
    kubectl get services -n ${NAMESPACE} -l app.kubernetes.io/part-of=grepmind-dashboard || true
    
    echo "\n--- Remaining PVCs ---"
    kubectl get pvc -n ${NAMESPACE} -l app.kubernetes.io/part-of=grepmind-dashboard || true
    
    echo "\n--- Helm Releases ---"
    helm list -n ${NAMESPACE} | grep grepmind-dashboard || echo "No GrepMind Dashboard releases found"
}

# Main execution
main() {
    log "Starting GrepMind Dashboard uninstall..."
    
    confirm_uninstall
    check_prerequisites
    backup_database
    uninstall_helm_releases
    remove_storage
    remove_rbac
    cleanup_leftover_resources
    remove_storage_class
    show_final_status
    
    success "🗑️  GrepMind Dashboard has been completely removed!"
    
    if [ -d "./backups" ]; then
        log "Database backups are available in: ./backups/"
    fi
    
    log "To redeploy, run: ./deploy.sh"
}

# Handle script arguments
case "${1:-}" in
    "--force")
        log "Force uninstall mode (skipping confirmation)"
        check_prerequisites
        backup_database
        uninstall_helm_releases
        remove_storage
        remove_rbac
        cleanup_leftover_resources
        show_final_status
        success "Force uninstall completed"
        ;;
    "--no-backup")
        log "Uninstall without backup"
        confirm_uninstall
        check_prerequisites
        uninstall_helm_releases
        remove_storage
        remove_rbac
        cleanup_leftover_resources
        remove_storage_class
        show_final_status
        success "Uninstall completed (no backup)"
        ;;
    *)
        main
        ;;
esac
