# Makefile for OneDrive to Backblaze B2 Migration App
# Usage: make [target]

.PHONY: help build up down dev prod logs status clean test

# Default target
help:
	@echo "OneDrive to Backblaze B2 Migration App - Docker Commands"
	@echo ""
	@echo "Available targets:"
	@echo "  build     Build Docker images"
	@echo "  up        Start services (standard mode)"
	@echo "  down      Stop services"
	@echo "  dev       Start development environment"
	@echo "  prod      Start production environment"
	@echo "  logs      Show application logs"
	@echo "  status    Show container status"
	@echo "  clean     Clean up containers and volumes"
	@echo "  test      Test Docker deployment"
	@echo "  help      Show this help message"

# Build Docker images
build:
	@echo "Building Docker images..."
	docker-compose build

# Start services (standard mode)
up:
	@echo "Starting services in standard mode..."
	docker-compose up -d
	@echo "Services started. Access application at http://localhost:3000"

# Stop services
down:
	@echo "Stopping services..."
	docker-compose down

# Development environment
dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started."
	@echo "Application: http://localhost:3000"
	@echo "Frontend dev server: http://localhost:5173"

# Production environment
prod:
	@echo "Starting production environment..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production environment started at http://localhost"

# Show logs
logs:
	@echo "Showing application logs..."
	docker-compose logs -f app

# Show container status
status:
	@echo "Container status:"
	docker-compose ps
	@echo ""
	@echo "Health check:"
	@docker-compose exec app curl -f http://localhost:3000/health 2>/dev/null || echo "Health check failed"

# Clean up
clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f
	@echo "Cleanup completed."

# Test deployment
test:
	@echo "Testing Docker deployment..."
	@if [ ! -f .env ]; then \
		echo "Creating .env from template..."; \
		cp env.template .env; \
		echo "Please edit .env with your actual values before running 'make up'"; \
	else \
		echo ".env file exists"; \
	fi
	docker-compose config
	@echo "Configuration is valid!"

# Initialize environment
init:
	@echo "Initializing environment..."
	@if [ ! -f .env ]; then \
		cp env.template .env; \
		echo "Created .env file from template. Please edit with your values."; \
	fi
	mkdir -p logs config data
	@echo "Initialization completed."

# Monitor services
monitor:
	@echo "Monitoring services (Ctrl+C to exit)..."
	watch -n 5 docker-compose ps

# Backup data
backup:
	@echo "Creating backup..."
	mkdir -p backups
	docker-compose exec redis redis-cli BGSAVE
	docker cp $$(docker-compose ps -q redis):/data/dump.rdb backups/redis-$$(date +%Y%m%d-%H%M%S).rdb
	tar -czf backups/config-$$(date +%Y%m%d-%H%M%S).tar.gz config/ logs/ .env 2>/dev/null || true
	@echo "Backup completed in backups/ directory"

# Show resource usage
stats:
	@echo "Container resource usage:"
	docker stats --no-stream

# Update images
update:
	@echo "Updating Docker images..."
	docker-compose pull
	docker-compose build --pull
	@echo "Images updated. Run 'make up' to restart with new images."
