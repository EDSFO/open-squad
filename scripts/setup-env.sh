#!/bin/bash
# =============================================================================
# Opensquad - Environment Setup Script
# =============================================================================
# Copies .env.example to .env and prompts for required values
# Usage: ./scripts/setup-env.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

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

log_prompt() {
    echo -e "${CYAN}[PROMPT]${NC} $1"
}

# Check if .env.example exists
check_files() {
    if [ ! -f "$ENV_EXAMPLE" ]; then
        log_error "$ENV_EXAMPLE not found!"
        exit 1
    fi
}

# Backup existing .env if it exists
backup_env() {
    if [ -f "$ENV_FILE" ]; then
        log_warn "$ENV_FILE already exists. Creating backup..."
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
}

# Copy .env.example to .env
copy_template() {
    log_info "Creating $ENV_FILE from template..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
}

# Prompt for a value with a default
prompt_value() {
    local key=$1
    local description=$2
    local default=$3
    local is_secret=${4:-false}

    echo ""
    log_prompt "$description"
    if [ -n "$default" ]; then
        echo -n "  [Default: $default] "
    else
        echo -n "  (required): "
    fi

    read value

    if [ -z "$value" ] && [ -n "$default" ]; then
        value=$default
    fi

    if [ -z "$value" ]; then
        value=""
    fi

    # Update the .env file
    if grep -q "^${key}=" "$ENV_FILE"; then
        if [ "$is_secret" = true ] && [ -n "$value" ]; then
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        fi
    fi

    echo "$value"
}

# Update a single value in .env
update_value() {
    local key=$1
    local value=$2

    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# Main setup process
main() {
    echo "============================================"
    echo "  Opensquad Environment Setup"
    echo "============================================"
    echo ""

    check_files
    backup_env
    copy_template

    echo ""
    echo "Please provide the following configuration values:"
    echo "Press Enter to accept the default value shown in brackets"
    echo ""

    # Database
    log_info "=== Database Configuration ==="
    local db_password
    db_password=$(prompt_value "POSTGRES_PASSWORD" "PostgreSQL password" "opensquad_secret" true)
    update_value "POSTGRES_PASSWORD" "$db_password"

    # Redis
    log_info "=== Redis Configuration ==="
    prompt_value "REDIS_URL" "Redis URL" "redis://localhost:6379" false

    # Stripe
    log_info "=== Stripe Configuration ==="
    prompt_value "STRIPE_SECRET_KEY" "Stripe Secret Key (sk_live_...)" "" true
    prompt_value "STRIPE_WEBHOOK_SECRET" "Stripe Webhook Secret (whsec_...)" "" true
    prompt_value "STRIPE_PUBLISHABLE_KEY" "Stripe Publishable Key (pk_live_...)" "" true
    prompt_value "STRIPE_PRICE_ID_STARTER" "Stripe Starter Plan Price ID" "" true
    prompt_value "STRIPE_PRICE_ID_GROWTH" "Stripe Growth Plan Price ID" "" true
    prompt_value "STRIPE_PRICE_ID_SCALE" "Stripe Scale Plan Price ID" "" true

    # AI Providers
    log_info "=== AI Provider Configuration ==="
    prompt_value "ANTHROPIC_API_KEY" "Anthropic API Key (sk-ant-...)" "" true
    prompt_value "OPENAI_API_KEY" "OpenAI API Key (sk-...)" "" true
    prompt_value "GOOGLE_AI_API_KEY" "Google AI API Key" "" true

    # Authentication
    log_info "=== Authentication Configuration ==="
    local jwt_secret
    jwt_secret=$(prompt_value "JWT_SECRET" "JWT Secret (min 32 characters)" "$(openssl rand -base64 32)" true)
    update_value "JWT_SECRET" "$jwt_secret"

    local jwt_refresh_secret
    jwt_refresh_secret=$(prompt_value "JWT_REFRESH_SECRET" "JWT Refresh Secret (min 32 characters)" "$(openssl rand -base64 32)" true)
    update_value "JWT_REFRESH_SECRET" "$jwt_refresh_secret"

    # Email
    log_info "=== Email Configuration (Resend) ==="
    prompt_value "RESEND_API_KEY" "Resend API Key (re_...)" "" true
    prompt_value "EMAIL_FROM" "Email From Address" "noreply@opensquad.com" false

    # Application
    log_info "=== Application Configuration ==="
    prompt_value "BACKEND_URL" "Backend URL (https://yourdomain.com)" "https://localhost" false

    echo ""
    log_info "Environment file created: $ENV_FILE"
    echo ""
    log_warn "IMPORTANT: Review and update the following in $ENV_FILE:"
    echo "  - All API keys (should be real values for production)"
    echo "  - BACKEND_URL (must be your production domain)"
    echo "  - JWT_SECRET and JWT_REFRESH_SECRET (auto-generated, but consider changing)"
    echo ""
    log_info "Never commit $ENV_FILE to version control!"
}

# Run main function
main "$@"
