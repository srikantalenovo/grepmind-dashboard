# GrepMind Dashboard - Makefile for Docker Image Management
# Author: MiniMax Agent

# Configuration
REGISTRY ?= docker.io
NAMESPACE ?= grepmind
FRONTEND_IMAGE = $(REGISTRY)/$(NAMESPACE)/frontend
BACKEND_IMAGE = $(REGISTRY)/$(NAMESPACE)/backend
TAG ?= latest
DOCKERFILE_FRONTEND = frontend/Dockerfile
DOCKERFILE_BACKEND = backend/Dockerfile

# Build contexts
FRONTEND_CONTEXT = frontend
BACKEND_CONTEXT = backend

# Default target
.PHONY: help
help: ## Show this help message
	@echo "GrepMind Dashboard - Docker Image Management"
	@echo "============================================="
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Build targets
.PHONY: build-frontend
build-frontend: ## Build frontend Docker image
	@echo "Building frontend image..."
	docker build -f $(DOCKERFILE_FRONTEND) -t $(FRONTEND_IMAGE):$(TAG) $(FRONTEND_CONTEXT)
	@echo "Frontend image built: $(FRONTEND_IMAGE):$(TAG)"

.PHONY: build-backend
build-backend: ## Build backend Docker image  
	@echo "Building backend image..."
	docker build -f $(DOCKERFILE_BACKEND) -t $(BACKEND_IMAGE):$(TAG) $(BACKEND_CONTEXT)
	@echo "Backend image built: $(BACKEND_IMAGE):$(TAG)"

.PHONY: build-all
build-all: build-frontend build-backend ## Build all Docker images
	@echo "All images built successfully!"

# Push targets
.PHONY: push-frontend
push-frontend: ## Push frontend image to registry
	@echo "Pushing frontend image..."
	docker push $(FRONTEND_IMAGE):$(TAG)
	@echo "Frontend image pushed: $(FRONTEND_IMAGE):$(TAG)"

.PHONY: push-backend
push-backend: ## Push backend image to registry
	@echo "Pushing backend image..."
	docker push $(BACKEND_IMAGE):$(TAG)
	@echo "Backend image pushed: $(BACKEND_IMAGE):$(TAG)"

.PHONY: push-all
push-all: push-frontend push-backend ## Push all images to registry
	@echo "All images pushed successfully!"

# Combined targets
.PHONY: build-and-push-frontend
build-and-push-frontend: build-frontend push-frontend ## Build and push frontend image

.PHONY: build-and-push-backend
build-and-push-backend: build-backend push-backend ## Build and push backend image

.PHONY: build-and-push-all
build-and-push-all: build-all push-all ## Build and push all images

# Validation targets
.PHONY: validate-frontend
validate-frontend: ## Validate frontend image
	@echo "Validating frontend image..."
	@docker run --rm $(FRONTEND_IMAGE):$(TAG) nginx -t
	@echo "Frontend image validation successful!"

.PHONY: validate-backend
validate-backend: ## Validate backend image
	@echo "Validating backend image..."
	@docker run --rm $(FRONTEND_IMAGE):$(TAG) node --version
	@echo "Backend image validation successful!"

.PHONY: validate-all
validate-all: validate-frontend validate-backend ## Validate all images

# Login and registry management
.PHONY: login
login: ## Login to Docker registry
	@echo "Logging in to registry: $(REGISTRY)"
	@docker login $(REGISTRY)

.PHONY: logout
logout: ## Logout from Docker registry
	@echo "Logging out from registry..."
	@docker logout $(REGISTRY)

# Image management
.PHONY: list-images
list-images: ## List built images
	@echo "Local GrepMind images:"
	@docker images | grep -E "($(NAMESPACE)/frontend|$(NAMESPACE)/backend)" || echo "No GrepMind images found"

.PHONY: clean-images
clean-images: ## Remove local images
	@echo "Removing local GrepMind images..."
	@docker rmi $(FRONTEND_IMAGE):$(TAG) $(BACKEND_IMAGE):$(TAG) 2>/dev/null || echo "Some images not found (already removed)"
	@echo "Local images cleaned!"

.PHONY: pull-all
pull-all: ## Pull all images from registry
	@echo "Pulling all images from registry..."
	docker pull $(FRONTEND_IMAGE):$(TAG)
	docker pull $(BACKEND_IMAGE):$(TAG)
	@echo "All images pulled successfully!"

# Development helpers
.PHONY: dev-build
dev-build: ## Build images with development tag
	$(MAKE) build-all TAG=dev

.PHONY: prod-build
prod-build: ## Build images with production tag
	$(MAKE) build-all TAG=prod

.PHONY: test-build
test-build: ## Build and validate images
	$(MAKE) build-all
	$(MAKE) validate-all

# Multi-architecture builds (requires buildx)
.PHONY: buildx-setup
buildx-setup: ## Setup Docker buildx for multi-arch builds
	@echo "Setting up Docker buildx..."
	docker buildx create --name grepmind-builder --driver docker-container --use 2>/dev/null || true
	docker buildx inspect --bootstrap

.PHONY: buildx-frontend
buildx-frontend: buildx-setup ## Build multi-arch frontend image
	@echo "Building multi-arch frontend image..."
	docker buildx build --platform linux/amd64,linux/arm64 \
		-f $(DOCKERFILE_FRONTEND) \
		-t $(FRONTEND_IMAGE):$(TAG) \
		--push $(FRONTEND_CONTEXT)

.PHONY: buildx-backend
buildx-backend: buildx-setup ## Build multi-arch backend image
	@echo "Building multi-arch backend image..."
	docker buildx build --platform linux/amd64,linux/arm64 \
		-f $(DOCKERFILE_BACKEND) \
		-t $(BACKEND_IMAGE):$(TAG) \
		--push $(BACKEND_CONTEXT)

.PHONY: buildx-all
buildx-all: buildx-frontend buildx-backend ## Build all multi-arch images

# Registry information
.PHONY: registry-info
registry-info: ## Show registry configuration
	@echo "Registry Configuration:"
	@echo "======================"
	@echo "Registry: $(REGISTRY)"
	@echo "Namespace: $(NAMESPACE)"
	@echo "Frontend Image: $(FRONTEND_IMAGE):$(TAG)"
	@echo "Backend Image: $(BACKEND_IMAGE):$(TAG)"
	@echo "Tag: $(TAG)"

# Complete workflow
.PHONY: deploy-prep
deploy-prep: build-all validate-all push-all ## Complete deployment preparation
	@echo "Deployment preparation complete!"
	@echo "Images ready for Kubernetes deployment:"
	@echo "  Frontend: $(FRONTEND_IMAGE):$(TAG)"
	@echo "  Backend: $(BACKEND_IMAGE):$(TAG)"

# Cleanup targets
.PHONY: clean-all
clean-all: clean-images ## Complete cleanup
	@docker system prune -f
	@echo "Complete cleanup finished!"