#!/bin/bash

# Docker deployment script for OneDrive to Backblaze B2 Migration App
# Usage: ./docker-deploy.sh [dev|prod]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_PROJECT_NAME="c2c-migration"
ENV_FILE=".env"
PROD_ENV_FILE=".env.production"

# Functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_requirements() {
    log "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    log "Requirements check passed."
}

setup_environment() {
    local env_mode=$1
    
    if [ "$env_mode" = "prod" ]; then
        if [ ! -f "$PROD_ENV_FILE" ]; then
            if [ -f "env.template" ]; then
                log "Creating production environment file..."
                cp env.template "$PROD_ENV_FILE"
                warn "Please edit $PROD_ENV_FILE with your production values before running again."
                exit 1
            else
                error "No environment template found. Please create $PROD_ENV_FILE manually."
            fi
        fi
    else
        if [ ! -f "$ENV_FILE" ]; then
            if [ -f "env.template" ]; then
                log "Creating development environment file..."
                cp env.template "$ENV_FILE"
                warn "Please edit $ENV_FILE with your values before running again."
                exit 1
            else
                error "No environment template found. Please create $ENV_FILE manually."
            fi
        fi
    fi
}

create_directories() {
    log "Creating necessary directories..."
    mkdir -p logs config data
    log "Directories created successfully."
}

deploy_development() {
    log "Deploying development environment..."
    
    setup_environment "dev"
    create_directories
    
    # Stop existing containers
    docker-compose -p "${COMPOSE_PROJECT_NAME}-dev" -f docker-compose.dev.yml down
    
    # Build and start services
    docker-compose -p "${COMPOSE_PROJECT_NAME}-dev" -f docker-compose.dev.yml up --build -d
    
    log "Development environment deployed successfully!"
    log "Access the application at: http://localhost:3000"
    log "Frontend dev server at: http://localhost:5173"
    log "Redis at: localhost:6379"
}

deploy_production() {
    log "Deploying production environment..."
    
    setup_environment "prod"
    create_directories
    
    # Stop existing containers
    docker-compose -p "${COMPOSE_PROJECT_NAME}-prod" -f docker-compose.prod.yml down
    
    # Build and start services
    docker-compose -p "${COMPOSE_PROJECT_NAME}-prod" -f docker-compose.prod.yml up --build -d
    
    log "Production environment deployed successfully!"
    log "Access the application at: http://localhost"
    log "Redis at: localhost:6379"
}

deploy_standard() {
    log "Deploying standard environment..."
    
    setup_environment "standard"
    create_directories
    
    # Stop existing containers
    docker-compose -p "${COMPOSE_PROJECT_NAME}" down
    
    # Build and start services
    docker-compose -p "${COMPOSE_PROJECT_NAME}" up --build -d
    
    log "Standard environment deployed successfully!"
    log "Access the application at: http://localhost:3000"
    log "Redis at: localhost:6379"
}

show_status() {
    log "Checking container status..."
    docker-compose -p "${COMPOSE_PROJECT_NAME}" ps
    
    log "Checking container health..."
    docker-compose -p "${COMPOSE_PROJECT_NAME}" exec app curl -f http://localhost:3000/health || warn "Health check failed"
}

show_logs() {
    local service=${1:-app}
    log "Showing logs for service: $service"
    docker-compose -p "${COMPOSE_PROJECT_NAME}" logs -f "$service"
}

cleanup() {
    log "Cleaning up containers and images..."
    docker-compose -p "${COMPOSE_PROJECT_NAME}" down -v
    docker-compose -p "${COMPOSE_PROJECT_NAME}-dev" down -v
    docker-compose -p "${COMPOSE_PROJECT_NAME}-prod" down -v
    docker system prune -f
    log "Cleanup completed."
}

show_help() {
    echo "Docker deployment script for OneDrive to Backblaze B2 Migration App"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  dev         Deploy development environment with hot reload"
    echo "  prod        Deploy production environment"
    echo "  standard    Deploy standard environment (default)"
    echo "  status      Show container status and health"
    echo "  logs [svc]  Show logs for service (default: app)"
    echo "  cleanup     Stop containers and clean up"
    echo "  help        Show this help message"
    echo
    echo "Examples:"
    echo "  $0 dev              # Deploy development environment"
    echo "  $0 prod             # Deploy production environment"
    echo "  $0 logs worker      # Show worker logs"
    echo "  $0 status           # Check deployment status"
}

# Main execution
main() {
    local command=${1:-standard}
    
    case $command in
        "dev")
            check_requirements
            deploy_development
            ;;
        "prod")
            check_requirements
            deploy_production
            ;;
        "standard")
            check_requirements
            deploy_standard
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $command. Use 'help' to see available commands."
            ;;
    esac
}

# Run main function with all arguments
main "$@"
