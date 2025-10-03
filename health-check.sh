#!/bin/bash

# Health Check Script for GrepMind Dashboard
# This script performs comprehensive health checks on all components

set -e

# Configuration
NAMESPACE="default"
HELM_RELEASE_NAME="grepmind-dashboard"
DOMAIN="dashboard.grepmind.com"

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

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command_exists kubectl; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists curl; then
        warn "curl is not installed, skipping HTTP health checks"
    fi
    
    success "Prerequisites check passed"
}

# Check cluster connectivity
check_cluster() {
    log "Checking Kubernetes cluster connectivity..."
    
    if kubectl cluster-info >/dev/null 2>&1; then
        success "Cluster connectivity: OK"
        kubectl cluster-info | head -2
    else
        fail "Cannot connect to Kubernetes cluster"
        return 1
    fi
}

# Check namespace
check_namespace() {
    log "Checking namespace: $NAMESPACE"
    
    if kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
        success "Namespace exists: $NAMESPACE"
    else
        fail "Namespace not found: $NAMESPACE"
        return 1
    fi
}

# Check PostgreSQL health
check_postgresql() {
    log "Checking PostgreSQL..."
    
    # Check if deployment exists
    if ! kubectl get deployment ${HELM_RELEASE_NAME}-postgresql -n ${NAMESPACE} >/dev/null 2>&1; then
        fail "PostgreSQL deployment not found"
        return 1
    fi
    
    # Check pod status
    local ready_replicas=$(kubectl get deployment ${HELM_RELEASE_NAME}-postgresql -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment ${HELM_RELEASE_NAME}-postgresql -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')
    
    if [ "$ready_replicas" = "$desired_replicas" ] && [ "$ready_replicas" != "" ]; then
        success "PostgreSQL: $ready_replicas/$desired_replicas replicas ready"
    else
        fail "PostgreSQL: $ready_replicas/$desired_replicas replicas ready"
        kubectl get pods -l app.kubernetes.io/name=grepmind-dashboard-postgresql -n ${NAMESPACE}
        return 1
    fi
    
    # Test database connection
    log "Testing database connection..."
    if kubectl exec deployment/${HELM_RELEASE_NAME}-postgresql -n ${NAMESPACE} -- \
        psql -U grepmind_user -d grepmind_dashboard -c "SELECT 1;" >/dev/null 2>&1; then
        success "Database connection: OK"
    else
        fail "Database connection: FAILED"
        return 1
    fi
}

# Check Backend health
check_backend() {
    log "Checking Backend..."
    
    # Check if deployment exists
    if ! kubectl get deployment ${HELM_RELEASE_NAME}-backend -n ${NAMESPACE} >/dev/null 2>&1; then
        fail "Backend deployment not found"
        return 1
    fi
    
    # Check pod status
    local ready_replicas=$(kubectl get deployment ${HELM_RELEASE_NAME}-backend -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment ${HELM_RELEASE_NAME}-backend -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')
    
    if [ "$ready_replicas" = "$desired_replicas" ] && [ "$ready_replicas" != "" ]; then
        success "Backend: $ready_replicas/$desired_replicas replicas ready"
    else
        fail "Backend: $ready_replicas/$desired_replicas replicas ready"
        kubectl get pods -l app.kubernetes.io/name=grepmind-dashboard-backend -n ${NAMESPACE}
        return 1
    fi
    
    # Test health endpoint
    log "Testing backend health endpoint..."
    local service_ip=$(kubectl get service ${HELM_RELEASE_NAME}-backend -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
    if kubectl run health-test --image=curlimages/curl --restart=Never --rm -i -- \
        curl -f "http://$service_ip:3001/api/health" >/dev/null 2>&1; then
        success "Backend health endpoint: OK"
    else
        fail "Backend health endpoint: FAILED"
        return 1
    fi
}

# Check Frontend health
check_frontend() {
    log "Checking Frontend..."
    
    # Check if deployment exists
    if ! kubectl get deployment ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} >/dev/null 2>&1; then
        fail "Frontend deployment not found"
        return 1
    fi
    
    # Check pod status
    local ready_replicas=$(kubectl get deployment ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')
    
    if [ "$ready_replicas" = "$desired_replicas" ] && [ "$ready_replicas" != "" ]; then
        success "Frontend: $ready_replicas/$desired_replicas replicas ready"
    else
        fail "Frontend: $ready_replicas/$desired_replicas replicas ready"
        kubectl get pods -l app.kubernetes.io/name=grepmind-dashboard-frontend -n ${NAMESPACE}
        return 1
    fi
    
    # Test frontend service
    log "Testing frontend service..."
    local service_ip=$(kubectl get service ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
    if kubectl run frontend-test --image=curlimages/curl --restart=Never --rm -i -- \
        curl -f "http://$service_ip:80" >/dev/null 2>&1; then
        success "Frontend service: OK"
    else
        fail "Frontend service: FAILED"
        return 1
    fi
}

# Check Ingress
check_ingress() {
    log "Checking Ingress..."
    
    # Check if ingress exists
    if ! kubectl get ingress ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} >/dev/null 2>&1; then
        fail "Ingress not found"
        return 1
    fi
    
    # Check ingress status
    local ingress_ip=$(kubectl get ingress ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -n "$ingress_ip" ]; then
        success "Ingress IP: $ingress_ip"
    else
        warn "Ingress IP not assigned yet"
        kubectl describe ingress ${HELM_RELEASE_NAME}-frontend -n ${NAMESPACE} | grep -A 5 "Events:"
    fi
    
    # Test external access (if curl is available)
    if command_exists curl; then
        log "Testing external access via domain..."
        if curl -f -s "http://$DOMAIN" >/dev/null 2>&1; then
            success "External access: OK (http://$DOMAIN)"
        else
            warn "External access: FAILED (http://$DOMAIN)"
            log "This might be due to DNS configuration or network policies"
        fi
    fi
}

# Check Storage
check_storage() {
    log "Checking Storage..."
    
    # Check PVCs
    local pvcs=$(kubectl get pvc -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)
    if [ "$pvcs" -gt 0 ]; then
        success "Found $pvcs PVC(s)"
        kubectl get pvc -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE}
    else
        warn "No PVCs found"
    fi
    
    # Check StorageClass
    if kubectl get storageclass nfs-storage >/dev/null 2>&1; then
        success "NFS StorageClass: OK"
    else
        warn "NFS StorageClass not found"
    fi
}

# Check RBAC
check_rbac() {
    log "Checking RBAC..."
    
    # Check ServiceAccount
    if kubectl get serviceaccount ${HELM_RELEASE_NAME}-backend -n ${NAMESPACE} >/dev/null 2>&1; then
        success "Backend ServiceAccount: OK"
    else
        warn "Backend ServiceAccount not found"
    fi
    
    # Check ClusterRole
    if kubectl get clusterrole ${HELM_RELEASE_NAME}-backend-reader >/dev/null 2>&1; then
        success "Backend ClusterRole: OK"
    else
        warn "Backend ClusterRole not found"
    fi
    
    # Check ClusterRoleBinding
    if kubectl get clusterrolebinding ${HELM_RELEASE_NAME}-backend-reader >/dev/null 2>&1; then
        success "Backend ClusterRoleBinding: OK"
    else
        warn "Backend ClusterRoleBinding not found"
    fi
}

# Performance checks
check_performance() {
    log "Checking Performance Metrics..."
    
    # Check resource usage
    echo "\n--- Resource Usage ---"
    kubectl top pods -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE} 2>/dev/null || warn "Metrics server not available"
    
    # Check events for any issues
    echo "\n--- Recent Events ---"
    kubectl get events -n ${NAMESPACE} --field-selector involvedObject.kind=Pod --sort-by='.lastTimestamp' | tail -10
}

# Generate health report
generate_report() {
    local report_file="health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    log "Generating health report: $report_file"
    
    {
        echo "GrepMind Dashboard Health Report"
        echo "Generated: $(date)"
        echo "Namespace: $NAMESPACE"
        echo "Domain: $DOMAIN"
        echo "="*50
        echo ""
        
        echo "--- Deployments ---"
        kubectl get deployments -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE}
        echo ""
        
        echo "--- Pods ---"
        kubectl get pods -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE}
        echo ""
        
        echo "--- Services ---"
        kubectl get services -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE}
        echo ""
        
        echo "--- Ingress ---"
        kubectl get ingress -n ${NAMESPACE}
        echo ""
        
        echo "--- Storage ---"
        kubectl get pvc,pv -l app.kubernetes.io/part-of=grepmind-dashboard -n ${NAMESPACE}
        echo ""
        
        echo "--- Recent Events ---"
        kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -20
        
    } > "$report_file"
    
    success "Health report saved: $report_file"
}

# Main health check
main() {
    log "Starting GrepMind Dashboard Health Check..."
    echo ""
    
    local failed_checks=0
    
    check_prerequisites || ((failed_checks++))
    check_cluster || ((failed_checks++))
    check_namespace || ((failed_checks++))
    check_postgresql || ((failed_checks++))
    check_backend || ((failed_checks++))
    check_frontend || ((failed_checks++))
    check_ingress || ((failed_checks++))
    check_storage || ((failed_checks++))
    check_rbac || ((failed_checks++))
    
    echo ""
    check_performance
    
    echo ""
    echo "="*60
    
    if [ $failed_checks -eq 0 ]; then
        success "🎉 All health checks passed! GrepMind Dashboard is healthy."
    else
        error "🚨 $failed_checks health check(s) failed. Please review the issues above."
    fi
    
    # Generate report if requested
    if [ "$1" = "--report" ]; then
        generate_report
    fi
    
    echo ""
    log "Access your dashboard at: http://$DOMAIN"
    log "To view logs: kubectl logs -f deployment/[component] -n $NAMESPACE"
    log "To scale: kubectl scale deployment/[component] --replicas=N -n $NAMESPACE"
    
    return $failed_checks
}

# Handle script arguments
case "${1:-}" in
    "--report")
        main --report
        ;;
    "--performance")
        check_prerequisites
        check_performance
        ;;
    "--storage")
        check_prerequisites
        check_storage
        ;;
    "--network")
        check_prerequisites
        check_ingress
        ;;
    *)
        main
        ;;
esac
