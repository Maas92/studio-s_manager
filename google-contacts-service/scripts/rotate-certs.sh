#!/bin/bash
# Certificate Rotation Script
# Usage: ./scripts/rotate-certs.sh [service-name]
# Example: ./scripts/rotate-certs.sh google-contacts

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CERTS_DIR="./certs"
BACKUP_DIR="./certs/backup-$(date +%Y%m%d-%H%M%S)"
CA_CERT="$CERTS_DIR/ca-cert.pem"
CA_KEY="$CERTS_DIR/ca-key.pem"
DAYS_VALID=365

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check certificate expiry
check_expiry() {
    local cert_file=$1
    local cert_name=$2
    
    if [ ! -f "$cert_file" ]; then
        print_warn "$cert_name not found at $cert_file"
        return 1
    fi
    
    expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s)
    now_epoch=$(date +%s)
    days_until_expiry=$(( ($expiry_epoch - $now_epoch) / 86400 ))
    
    print_info "$cert_name expires in $days_until_expiry days ($expiry_date)"
    
    if [ $days_until_expiry -lt 0 ]; then
        print_error "$cert_name has EXPIRED!"
        return 2
    elif [ $days_until_expiry -lt 30 ]; then
        print_warn "$cert_name expires soon (less than 30 days)!"
        return 3
    fi
    
    return 0
}

# Function to backup existing certificates
backup_certs() {
    print_info "Backing up existing certificates to $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "$CERTS_DIR"/*.pem ]; then
        cp "$CERTS_DIR"/*.pem "$BACKUP_DIR/" 2>/dev/null || true
        print_info "Backup completed"
    else
        print_warn "No certificates found to backup"
    fi
}

# Function to generate service certificate
generate_service_cert() {
    local service_name=$1
    local cert_file="$CERTS_DIR/${service_name}-cert.pem"
    local key_file="$CERTS_DIR/${service_name}-key.pem"
    local csr_file="$CERTS_DIR/${service_name}.csr"
    
    print_info "Generating certificate for $service_name..."
    
    # Generate private key
    openssl genrsa -out "$key_file" 4096
    
    # Generate CSR
    openssl req -new -key "$key_file" -out "$csr_file" \
        -subj "/C=US/ST=State/L=City/O=StudioS/CN=${service_name}"
    
    # Sign with CA
    openssl x509 -req -in "$csr_file" \
        -CA "$CA_CERT" -CAkey "$CA_KEY" \
        -CAcreateserial -out "$cert_file" \
        -days $DAYS_VALID \
        -sha256
    
    # Clean up CSR
    rm "$csr_file"
    
    print_info "Certificate generated for $service_name"
    print_info "  Certificate: $cert_file"
    print_info "  Private Key: $key_file"
}

# Main script
main() {
    local service_name=${1:-""}
    
    print_info "Certificate Rotation Script"
    print_info "============================="
    echo
    
    # Create certs directory if it doesn't exist
    mkdir -p "$CERTS_DIR"
    
    # Check if CA exists
    if [ ! -f "$CA_CERT" ] || [ ! -f "$CA_KEY" ]; then
        print_error "CA certificate or key not found!"
        print_info "Generating new CA..."
        
        openssl genrsa -out "$CA_KEY" 4096
        openssl req -new -x509 -key "$CA_KEY" -out "$CA_CERT" \
            -days $((DAYS_VALID * 3)) \
            -subj "/C=US/ST=State/L=City/O=StudioS/CN=StudioS-CA"
        
        print_info "CA certificate generated"
    fi
    
    # Check CA expiry
    check_expiry "$CA_CERT" "CA Certificate"
    echo
    
    # If service name provided, rotate that service only
    if [ -n "$service_name" ]; then
        local cert_file="$CERTS_DIR/${service_name}-cert.pem"
        
        # Check if certificate needs rotation
        if check_expiry "$cert_file" "$service_name"; then
            print_info "$service_name certificate is still valid"
            read -p "Do you want to rotate it anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Skipping rotation"
                exit 0
            fi
        fi
        
        # Backup and generate
        backup_certs
        generate_service_cert "$service_name"
        
        print_info "✅ Certificate rotation completed for $service_name"
        print_warn "Remember to restart the $service_name service!"
        
    else
        # Check all service certificates
        print_info "Checking all certificates..."
        echo
        
        services=("google-contacts" "backend" "auth" "gateway")
        need_rotation=()
        
        for service in "${services[@]}"; do
            cert_file="$CERTS_DIR/${service}-cert.pem"
            if ! check_expiry "$cert_file" "$service"; then
                need_rotation+=("$service")
            fi
            echo
        done
        
        if [ ${#need_rotation[@]} -eq 0 ]; then
            print_info "All certificates are valid!"
            exit 0
        fi
        
        print_warn "The following services need certificate rotation:"
        for service in "${need_rotation[@]}"; do
            echo "  - $service"
        done
        echo
        
        read -p "Rotate these certificates? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Aborted"
            exit 0
        fi
        
        # Backup and rotate
        backup_certs
        for service in "${need_rotation[@]}"; do
            generate_service_cert "$service"
            echo
        done
        
        print_info "✅ Certificate rotation completed"
        print_warn "Remember to restart affected services!"
    fi
}

# Run main function
main "$@"