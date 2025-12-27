#!/bin/bash
# Certificate Monitoring Setup Script
# This sets up automated certificate expiry checking and notifications

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

print_info "Certificate Monitoring Setup"
print_info "============================"
echo

# Create monitoring script
cat > "$SCRIPTS_DIR/check-cert-expiry.sh" << 'EOF'
#!/bin/bash
# Certificate Expiry Checker
# Runs daily to check certificate expiry and send notifications

CERTS_DIR="./certs"
ALERT_DAYS=30
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

services=("google-contacts" "backend" "auth" "gateway" "ca")

check_cert() {
    local cert_file=$1
    local cert_name=$2
    
    if [ ! -f "$cert_file" ]; then
        return 1
    fi
    
    expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s)
    now_epoch=$(date +%s)
    days_until_expiry=$(( ($expiry_epoch - $now_epoch) / 86400 ))
    
    if [ $days_until_expiry -lt $ALERT_DAYS ]; then
        message="⚠️  Certificate Alert: $cert_name expires in $days_until_expiry days ($expiry_date)"
        echo "$message"
        
        # Send Slack notification if webhook URL is set
        if [ -n "$WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"$message\"}" \
                "$WEBHOOK_URL" 2>/dev/null || true
        fi
        
        # Log to system log
        logger -t cert-monitor "$message"
        
        return 1
    fi
    
    return 0
}

# Check all certificates
cd "$(dirname "$0")/.."
has_warnings=0

for service in "${services[@]}"; do
    if [ "$service" = "ca" ]; then
        cert_file="$CERTS_DIR/ca-cert.pem"
    else
        cert_file="$CERTS_DIR/${service}-cert.pem"
    fi
    
    if ! check_cert "$cert_file" "$service"; then
        has_warnings=1
    fi
done

if [ $has_warnings -eq 0 ]; then
    echo "✅ All certificates are valid (expire in more than $ALERT_DAYS days)"
fi

exit $has_warnings
EOF

chmod +x "$SCRIPTS_DIR/check-cert-expiry.sh"
chmod +x "$SCRIPTS_DIR/rotate-certs.sh"

print_info "Certificate monitoring script created"
echo

# Setup cron job
print_info "Setting up daily cron job..."

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "check-cert-expiry.sh"; then
    print_warn "Cron job already exists"
else
    # Add cron job (runs daily at 9 AM)
    (crontab -l 2>/dev/null; echo "0 9 * * * cd $PROJECT_ROOT && $SCRIPTS_DIR/check-cert-expiry.sh >> $PROJECT_ROOT/logs/cert-monitor.log 2>&1") | crontab -
    print_info "✅ Cron job added (runs daily at 9 AM)"
fi

echo

# Create systemd timer as alternative (for systems with systemd)
print_info "Creating systemd timer (optional)..."

cat > /tmp/cert-monitor.service << EOF
[Unit]
Description=Certificate Expiry Monitor
After=network.target

[Service]
Type=oneshot
User=$(whoami)
WorkingDirectory=$PROJECT_ROOT
ExecStart=$SCRIPTS_DIR/check-cert-expiry.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /tmp/cert-monitor.timer << EOF
[Unit]
Description=Certificate Expiry Monitor Timer
Requires=cert-monitor.service

[Timer]
OnCalendar=daily
OnCalendar=09:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

print_info "Systemd unit files created in /tmp/"
print_info "To install systemd timer (requires sudo):"
echo "  sudo cp /tmp/cert-monitor.service /etc/systemd/system/"
echo "  sudo cp /tmp/cert-monitor.timer /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable cert-monitor.timer"
echo "  sudo systemctl start cert-monitor.timer"
echo

# Setup Slack webhook (optional)
print_info "Slack Notifications Setup (Optional)"
print_info "====================================="
echo "To receive Slack notifications when certificates expire:"
echo "1. Create a Slack webhook: https://api.slack.com/messaging/webhooks"
echo "2. Add to your .env file:"
echo "   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
echo "3. Or export it: export SLACK_WEBHOOK_URL=https://hooks.slack.com/..."
echo

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

print_info "✅ Setup complete!"
echo
print_info "What's been set up:"
echo "  ✓ Certificate expiry checker script"
echo "  ✓ Automatic certificate rotation script"
echo "  ✓ Daily cron job (9 AM)"
echo "  ✓ Systemd timer files (optional)"
echo "  ✓ Log directory"
echo
print_info "To manually check certificates now:"
echo "  $SCRIPTS_DIR/check-cert-expiry.sh"
echo
print_info "To manually rotate certificates:"
echo "  $SCRIPTS_DIR/rotate-certs.sh [service-name]"
echo
print_warn "Pro tip: Set SLACK_WEBHOOK_URL to get notifications!"