#!/bin/bash
# =============================================================================
# Opensquad - Production Deployment Script
# =============================================================================
# Deploys the application to production using Docker Compose
# Usage: ./scripts/deploy.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
check_env() {
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please run ./scripts/setup-env.sh first."
        exit 1
    fi
}

# Pull latest code from git
pull_latest() {
    log_info "Pulling latest code from git..."
    git pull origin main
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    docker-compose -f $COMPOSE_FILE build --no-cache
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    docker-compose -f $COMPOSE_FILE run --rm backend npx prisma migrate deploy
}

# Create database backup before migration
backup_database() {
    log_info "Creating database backup..."
    mkdir -p $BACKUP_DIR

    docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U opensquad opensquad > "$BACKUP_DIR/opensquad_backup_$TIMESTAMP.sql" 2>/dev/null || {
        log_warn "Backup failed, continuing anyway..."
    }
}

# Restart services
restart_services() {
    log_info "Restarting services with rolling rebuild..."
    docker-compose -f $COMPOSE_FILE up -d --build
}

# Wait for services to be healthy
wait_for_healthy() {
    log_info "Waiting for services to be healthy..."

    local max_wait=120
    local waited=0

    while [ $waited -lt $max_wait ]; do
        # Check nginx health
        if docker-compose -f $COMPOSE_FILE exec -T nginx wget --quiet --tries=1 --spider http://localhost/health > /dev/null 2>&1; then
            log_info "All services are healthy!"
            return 0
        fi

        echo -n "."
        sleep 2
        waited=$((waited + 2))
    done

    echo ""
    log_error "Services did not become healthy in time"
    return 1
}

# Show service status
show_status() {
    log_info "Service status:"
    docker-compose -f $COMPOSE_FILE ps
}

# Main deployment process
main() {
    echo "============================================"
    echo "  Opensquad Production Deployment"
    echo "============================================"
    echo ""

    check_env
    pull_latest
    backup_database
    build_images
    run_migrations
    restart_services
    wait_for_healthy
    show_status

    echo ""
    log_info "Deployment complete!"
    log_info "Application should be available at https://$(hostname -f)"
}

# Run main function
main "$@"
