#!/bin/bash

# GrepMind Quick Start Script
# This script helps you get GrepMind up and running quickly

set -e

echo "🧠 GrepMind Quick Start Setup"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check for model files
check_models() {
    if [ ! -d "models" ]; then
        print_warning "Models directory not found. Creating it..."
        mkdir -p models
    fi
    
    if [ -z "$(find models -name '*.gguf' -type f 2>/dev/null)" ]; then
        print_warning "No GGUF model files found in ./models/ directory"
        echo ""
        echo "You need to download a GGUF model file and place it in the ./models/ directory."
        echo ""
        echo "Recommended models:"
        echo "  • Llama 2 7B Chat (4-5GB): https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF"
        echo "  • Mistral 7B Instruct (4-5GB): https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF"
        echo "  • Code Llama 7B (4-5GB): https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF"
        echo ""
        echo "Example download (using wget):"
        echo "  wget -P models/ https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        MODEL_FILE=$(find models -name '*.gguf' -type f | head -1)
        print_success "Found model: $(basename "$MODEL_FILE")"
    fi
}

# Setup environment variables
setup_env() {
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Creating from example..."
        cp .env.example .env
        
        # Generate a random JWT secret
        if command -v openssl &> /dev/null; then
            JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
            # Use a more reliable method to replace the JWT secret
            # Create a temporary file to avoid sed issues with special characters
            TEMP_FILE=$(mktemp)
            while IFS= read -r line; do
                if [[ $line == JWT_SECRET=* ]]; then
                    echo "JWT_SECRET=$JWT_SECRET"
                else
                    echo "$line"
                fi
            done < .env > "$TEMP_FILE"
            mv "$TEMP_FILE" .env
            print_success "Generated secure JWT secret"
        else
            print_warning "OpenSSL not found. Using default JWT secret (change it in production!)"
        fi
        
        print_warning "Please edit .env file and add your OpenAI API key for embeddings (optional but recommended)"
    else
        print_success "Environment file (.env) already exists"
    fi
}

# Main setup
main() {
    print_step "Checking system requirements"
    check_docker
    
    print_step "Checking for AI models"
    check_models
    
    print_step "Setting up environment"
    setup_env
    
    print_step "Building and starting GrepMind"
    echo "This may take a few minutes on first run..."
    
    # Build and start services
    if command -v docker-compose &> /dev/null; then
        docker-compose up --build
    else
        docker compose up --build
    fi
}

# Handle script interruption
trap 'print_warning "Setup interrupted by user"; exit 1' INT

# Run main function
main

print_success "GrepMind setup completed!"
echo ""
echo "🌐 Access your application at:"
echo "   Frontend: http://dashboard.grepmind.com/"
echo "   Backend API: http://dashboard.grepmind.com/api"
echo ""
echo "📚 Check the README.md for more information and troubleshooting."
echo "🎉 Happy monitoring your Kubernetes cluster!"
