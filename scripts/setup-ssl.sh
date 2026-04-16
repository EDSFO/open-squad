#!/bin/bash
# =============================================================================
# Opensquad - SSL Certificate Setup Script
# =============================================================================
# Sets up Let's Encrypt SSL certificates using Certbot
# Usage: ./scripts/setup-ssl.sh <domain>
# Example: ./scripts/setup-ssl.sh opensquad.example.com
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SSL_DIR="./nginx/ssl"
CERTBOT_IMAGE="certbot/certbot:latest"
WEBROOT_PATH="/var/www/certbot"

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

# Check if running as root or with docker sudo access
check_permissions() {
    if ! docker ps > /dev/null 2>&1; then
        log_error "Docker permission denied. Please add your user to the docker group:"
        echo "  sudo usermod -aG docker \$USER"
        exit 1
    fi
}

# Ensure SSL directory exists
ensure_ssl_dir() {
    log_info "Creating SSL directory..."
    mkdir -p $SSL_DIR/live
    mkdir -p $WEBROOT_PATH
}

# Get certificate using standalone mode (nginx must be stopped)
get_certificate_standalone() {
    local domain=$1
    local email=$2

    log_info "Getting certificate for $domain using standalone mode..."

    # Stop nginx temporarily
    docker-compose down nginx 2>/dev/null || true

    # Run certbot in standalone mode
    docker run --rm \
        -v "$(pwd)/$SSL_DIR:/etc/letsencrypt" \
        -v "$(pwd)/$WEBROOT_PATH:/var/www/certbot" \
        -p 80:80 \
        $CERTBOT_IMAGE \
        certonly --standalone \
        --preferred-challenges http-01 \
        --http-01-port 80 \
        --domains "$domain" \
        --email "$email" \
        --agree-tos \
        --no-eff-email \
        --keep-until-expiring

    local result=$?

    # Restart nginx
    docker-compose up -d nginx

    return $result
}

# Get certificate using webroot mode (nginx keeps running)
get_certificate_webroot() {
    local domain=$1
    local email=$2

    log_info "Getting certificate for $domain using webroot mode..."

    # Run certbot with webroot
    docker run --rm \
        -v "$(pwd)/$SSL_DIR:/etc/letsencrypt" \
        -v "$(pwd)/$WEBROOT_PATH:/var/www/certbot" \
        $CERTBOT_IMAGE \
        certonly --webroot \
        --webroot-path="$WEBROOT_PATH" \
        --domains "$domain" \
        --email "$email" \
        --agree-tos \
        --no-eff-email \
        --keep-until-expiring

    return $?
}

# Generate dhparams for increased security
generate_dhparams() {
    log_info "Generating DH parameters (this may take a minute)..."

    if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
    fi
}

# Set correct permissions
set_permissions() {
    log_info "Setting permissions..."
    chmod 600 $SSL_DIR/privkey.pem
    chmod 600 $SSL_DIR/dhparam.pem
    chmod 644 $SSL_DIR/fullchain.pem
    chmod 644 $SSL_DIR/cert.pem
    chmod 755 $SSL_DIR/live
}

# Verify certificate
verify_certificate() {
    local domain=$1
    log_info "Verifying certificate for $domain..."

    if [ -f "$SSL_DIR/live/fullchain.pem" ]; then
        log_info "Certificate successfully obtained!"
        log_info "Certificate expires: $(openssl x509 -noout -dates -in $SSL_DIR/live/fullchain.pem | grep notAfter)"
    else
        log_error "Certificate not found!"
        return 1
    fi
}

# Print usage
usage() {
    echo "Usage: $0 <domain> [email]"
    echo ""
    echo "Arguments:"
    echo "  domain   - The domain name for the certificate (e.g., opensquad.example.com)"
    echo "  email    - Email for Let's Encrypt notifications (optional)"
    echo ""
    echo "Example:"
    echo "  $0 opensquad.example.com admin@example.com"
}

# Main function
main() {
    local domain=$1
    local email=${2:-}

    if [ -z "$domain" ]; then
        usage
        exit 1
    fi

    echo "============================================"
    echo "  Opensquad SSL Certificate Setup"
    echo "============================================"
    echo ""

    check_permissions
    ensure_ssl_dir

    # Prompt for email if not provided
    if [ -z "$email" ]; then
        echo -n "Enter email for Let's Encrypt notifications: "
        read email
    fi

    if [ -z "$email" ]; then
        email="admin@$domain"
    fi

    # Try webroot first (doesn't require stopping nginx)
    if ! get_certificate_webroot "$domain" "$email"; then
        log_warn "Webroot mode failed, trying standalone mode..."
        if ! get_certificate_standalone "$domain" "$email"; then
            log_error "Failed to obtain certificate"
            exit 1
        fi
    fi

    generate_dhparams
    set_permissions
    verify_certificate "$domain"

    echo ""
    log_info "SSL setup complete!"
    log_info "Your certificate is stored in $SSL_DIR/live"
    log_info ""
    log_info "To renew certificates, run:"
    echo "  docker-compose -f docker-compose.prod.yml run --rm certbot renew"
}

# Run main function
main "$@"
