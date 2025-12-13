#!/bin/bash

# =============================================================================
# Production Setup Script
# =============================================================================
# This script sets up your production environment
# Run with: bash setup-production.sh
# =============================================================================

set -e

echo "🚀 Studio-S Production Setup"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run as root${NC}"
   exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p traefik
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p logs
mkdir -p backups

# Create acme.json for SSL certificates
echo "🔐 Setting up SSL certificate storage..."
touch traefik/acme.json
chmod 600 traefik/acme.json
echo -e "${GREEN}✅ Created traefik/acme.json${NC}"

# Create traefik/config.yml
cat > traefik/config.yml <<EOF
http:
  middlewares:
    default-compress:
      compress: {}
    default-ratelimit:
      rateLimit:
        average: 100
        burst: 50
EOF

echo -e "${GREEN}✅ Created traefik/config.yml${NC}"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Creating .env.production from template..."
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    GATEWAY_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    GRAFANA_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
    
    cat > .env.production <<EOF
NODE_ENV=production
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com

# IMPORTANT: Configure these before deploying
CLOUDFLARE_EMAIL=your-email@yourdomain.com
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token

# Database URLs - CONFIGURE THESE
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
DATABASE_URL=postgresql://username:password@hostname:5432/dbname

# Auto-generated secrets (already secure)
JWT_SECRET=${JWT_SECRET}
GATEWAY_SECRET=${GATEWAY_SECRET}
GRAFANA_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
EOF
    
    echo -e "${GREEN}✅ Created .env.production with auto-generated secrets${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.production and configure:${NC}"
    echo "   - DOMAIN"
    echo "   - CLOUDFLARE_EMAIL and CLOUDFLARE_API_TOKEN"
    echo "   - MONGODB_URI"
    echo "   - DATABASE_URL"
    echo ""
else
    echo -e "${GREEN}✅ .env.production already exists${NC}"
fi

# Create Grafana datasource
cat > monitoring/grafana/provisioning/datasources/datasources.yml <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF

echo -e "${GREEN}✅ Created Grafana datasources configuration${NC}"

# Create backup script
cat > backup.sh <<'EOF'
#!/bin/bash
# Automated backup script

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🔄 Starting backup at $DATE"

# Backup volumes
docker run --rm \
  -v studio-s-redis-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis-$DATE.tar.gz -C /data .

docker run --rm \
  -v studio-s-prometheus-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/prometheus-$DATE.tar.gz -C /data .

docker run --rm \
  -v studio-s-grafana-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/grafana-$DATE.tar.gz -C /data .

echo "✅ Backup completed: $BACKUP_DIR"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh
echo -e "${GREEN}✅ Created backup.sh script${NC}"

# Create health check script
cat > health-check.sh <<'EOF'
#!/bin/bash
# Health check script for all services

echo "🏥 Health Check Report"
echo "====================="

services=("frontend" "gateway" "auth" "backend" "redis")

for service in "${services[@]}"; do
    status=$(docker inspect --format='{{.State.Health.Status}}' studio-s-$service 2>/dev/null)
    if [ "$status" == "healthy" ]; then
        echo "✅ $service: healthy"
    else
        echo "❌ $service: $status"
    fi
done
EOF

chmod +x health-check.sh
echo -e "${GREEN}✅ Created health-check.sh script${NC}"

# Summary
echo ""
echo "=============================="
echo -e "${GREEN}✅ Production setup complete!${NC}"
echo "=============================="
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Edit .env.production and configure:"
echo "   - Your domain name"
echo "   - Cloudflare API credentials"
echo "   - Database connection strings"
echo ""
echo "2. Point your domain DNS to this server's IP"
echo ""
echo "3. Deploy with:"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "4. Monitor your deployment:"
echo "   - Traefik Dashboard: https://traefik.yourdomain.com"
echo "   - Grafana: https://grafana.yourdomain.com"
echo "   - Prometheus: https://prometheus.yourdomain.com"
echo ""
echo "5. Set up automated backups (cron):"
echo "   crontab -e"
echo "   0 2 * * * /path/to/backup.sh"
echo ""
echo "📚 Documentation: https://docs.yourdomain.com"
echo ""