import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as cloudflare from "@pulumi/cloudflare";

// =============================================================================
// Configuration
// =============================================================================

const config = new pulumi.Config();
const projectName = "studio-s";
const environment = pulumi.getStack();

// VPS Configuration (manually provision VPS first)
const vpsIp = config.require("160.119.249.3"); // Your VPS IP address
const vpsUser = config.get("deploy") || "root"; // SSH user
const sshPrivateKey = config.requireSecret("sshPrivateKey"); // Your SSH private key

// Application Configuration
const domain = config.require("app.studiosbeautybar.com");
const enableArgoCD = config.getBoolean("enableArgoCD") ?? true;
const enableMonitoring = config.getBoolean("enableMonitoring") ?? true;

// Database Configuration (external)
const databaseUrl = config.requireSecret("databaseUrl");
const mongodbUri = config.requireSecret("mongodbUri");

// Secrets
const jwtSecret = config.requireSecret("jwtSecret");
const gatewaySecret = config.requireSecret("gatewaySecret");
const argocdAdminPassword = config.requireSecret("argocdAdminPassword");

const tags = {
  Project: projectName,
  Environment: environment,
  ManagedBy: "Pulumi",
  Provider: "Generic-VPS",
};

// =============================================================================
// VPS Setup Script
// Complete server configuration with k3s
// =============================================================================

const setupScript = `#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════"
echo "🚀 Studio-S VPS Setup - Starting..."
echo "════════════════════════════════════════════════════════════"

# =============================================================================
# System Update & Security Hardening
# =============================================================================

echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt update
apt upgrade -y
apt dist-upgrade -y

echo "🔒 Installing security tools..."
apt-get install -y \\
    ufw \\
    fail2ban \\
    unattended-upgrades \\
    apt-listchanges

# Configure automatic security updates
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

echo "unattended-upgrades unattended-upgrades/enable_auto_updates boolean true" | debconf-set-selections
dpkg-reconfigure -f noninteractive unattended-upgrades

# =============================================================================
# Firewall Configuration (UFW)
# =============================================================================

echo "🔥 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (preserve current connection)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow k3s API server
ufw allow 6443/tcp comment 'Kubernetes API'

# Allow Prometheus metrics
ufw allow 9100/tcp comment 'Node Exporter'
ufw allow 10254/tcp comment 'Nginx Ingress Metrics'

# Enable firewall
ufw --force enable

echo "✅ Firewall configured"

# =============================================================================
# Fail2ban Configuration
# =============================================================================

echo "🛡️  Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@${domain}
sendername = Fail2Ban

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo "✅ Fail2ban configured"

# =============================================================================
# Install Essential Tools
# =============================================================================

echo "🛠️  Installing essential tools..."
apt-get install -y \\
    curl \\
    wget \\
    git \\
    htop \\
    iotop \\
    nethogs \\
    jq \\
    net-tools \\
    ca-certificates \\
    gnupg \\
    lsb-release \\
    software-properties-common

# =============================================================================
# Install k3s (Lightweight Kubernetes)
# =============================================================================

echo "☸️  Installing k3s..."

# Get public IP
PUBLIC_IP=$(curl -s http://ifconfig.me)

# Install k3s
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="v1.28.5+k3s1" sh -s - server \\
    --write-kubeconfig-mode=644 \\
    --disable traefik \\
    --disable servicelb \\
    --tls-san=\${PUBLIC_IP} \\
    --tls-san=${domain} \\
    --node-name=master \\
    --cluster-init

# Wait for k3s to be ready
echo "⏳ Waiting for k3s to be ready..."
sleep 30

until kubectl get nodes 2>/dev/null | grep -q "Ready"; do
    echo "Waiting for k3s..."
    sleep 5
done

echo "✅ k3s installed and running"

# =============================================================================
# Install Helm
# =============================================================================

echo "📦 Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# =============================================================================
# Configure kubectl
# =============================================================================

echo "⚙️  Configuring kubectl..."
mkdir -p /root/.kube
cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
chmod 600 /root/.kube/config

# Export kubeconfig for remote access
mkdir -p /opt/k3s
cp /etc/rancher/k3s/k3s.yaml /opt/k3s/kubeconfig.yaml
sed -i "s/127.0.0.1/\${PUBLIC_IP}/g" /opt/k3s/kubeconfig.yaml
chmod 644 /opt/k3s/kubeconfig.yaml

# =============================================================================
# Install cert-manager (Let's Encrypt SSL)
# =============================================================================

echo "🔐 Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# Wait for cert-manager
kubectl wait --for=condition=Available --timeout=300s deployment --all -n cert-manager

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@${domain}
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@${domain}
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

echo "✅ cert-manager installed"

# =============================================================================
# Install nginx-ingress
# =============================================================================

echo "🌐 Installing nginx-ingress..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \\
    --namespace ingress-nginx --create-namespace \\
    --set controller.service.type=NodePort \\
    --set controller.service.nodePorts.http=80 \\
    --set controller.service.nodePorts.https=443 \\
    --set controller.hostPort.enabled=true \\
    --set controller.hostPort.ports.http=80 \\
    --set controller.hostPort.ports.https=443 \\
    --set controller.metrics.enabled=true \\
    --set controller.metrics.serviceMonitor.enabled=false

# Wait for ingress
kubectl wait --for=condition=Available --timeout=300s deployment -n ingress-nginx ingress-nginx-controller

echo "✅ nginx-ingress installed"

# =============================================================================
# Install metrics-server
# =============================================================================

echo "📊 Installing metrics-server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch for insecure TLS (required for k3s)
kubectl patch deployment metrics-server -n kube-system --type='json' \\
    -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

echo "✅ metrics-server installed"

# =============================================================================
# Install ArgoCD
# =============================================================================

if [ "${enableArgoCD}" = "true" ]; then
    echo "🔄 Installing ArgoCD..."
    
    kubectl create namespace argocd || true
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    
    # Wait for ArgoCD
    kubectl wait --for=condition=Available --timeout=600s deployment --all -n argocd
    
    # Update ArgoCD admin password
    ARGOCD_BCRYPT_HASH=$(htpasswd -nbBC 10 admin "${argocdAdminPassword}" | awk -F: '{print $2}')
    kubectl -n argocd patch secret argocd-secret \\
        -p "{\\"stringData\\": {\\"admin.password\\": \\"\${ARGOCD_BCRYPT_HASH}\\", \\"admin.passwordMtime\\": \\"\$(date +%FT%T%Z)\\"}}"
    
    # Create ArgoCD ingress
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - argocd.${domain}
    secretName: argocd-tls
  rules:
  - host: argocd.${domain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 443
EOF
    
    echo "✅ ArgoCD installed"
fi

# =============================================================================
# Install Monitoring Stack (Optional)
# =============================================================================

if [ "${enableMonitoring}" = "true" ]; then
    echo "📈 Installing monitoring stack..."
    
    # Install Prometheus Node Exporter
    wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
    tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz
    mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
    rm -rf node_exporter-1.7.0.linux-amd64*
    
    # Create systemd service
    cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter
    
    # Install kube-prometheus-stack
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm install prometheus prometheus-community/kube-prometheus-stack \\
        --namespace monitoring --create-namespace \\
        --set grafana.ingress.enabled=true \\
        --set grafana.ingress.ingressClassName=nginx \\
        --set grafana.ingress.hosts[0]=grafana.${domain} \\
        --set grafana.ingress.tls[0].secretName=grafana-tls \\
        --set grafana.ingress.tls[0].hosts[0]=grafana.${domain} \\
        --set grafana.ingress.annotations."cert-manager\\.io/cluster-issuer"=letsencrypt-prod \\
        --set grafana.adminPassword="${argocdAdminPassword}"
    
    echo "✅ Monitoring stack installed"
fi

# =============================================================================
# Create Application Directories
# =============================================================================

echo "📁 Creating application directories..."
mkdir -p /opt/studio-s/{config,secrets,data,logs,backups}
chmod 700 /opt/studio-s/secrets

# =============================================================================
# Create Kubernetes Namespace and Secrets
# =============================================================================

echo "🔑 Creating Kubernetes resources..."
kubectl create namespace studio-s || true

# Create database secrets
kubectl create secret generic database-credentials \\
    --from-literal=connectionString="${databaseUrl}" \\
    --namespace studio-s \\
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic mongodb-credentials \\
    --from-literal=connectionString="${mongodbUri}" \\
    --namespace studio-s \\
    --dry-run=client -o yaml | kubectl apply -f -

# Create JWT secrets
kubectl create secret generic jwt-secrets \\
    --from-literal=secret="${jwtSecret}" \\
    --from-literal=gatewaySecret="${gatewaySecret}" \\
    --namespace studio-s \\
    --dry-run=client -o yaml | kubectl apply -f -

# =============================================================================
# Create Backup Script
# =============================================================================

echo "💾 Creating backup scripts..."
cat > /opt/studio-s/backup.sh <<'BACKUP_SCRIPT'
#!/bin/bash
set -e

BACKUP_DIR="/opt/studio-s/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

echo "🔄 Starting backup at \$DATE"

# Backup Kubernetes resources
kubectl get all --all-namespaces -o yaml > \$BACKUP_DIR/k8s-resources-\$DATE.yaml
kubectl get secrets --all-namespaces -o yaml > \$BACKUP_DIR/k8s-secrets-\$DATE.yaml
kubectl get configmaps --all-namespaces -o yaml > \$BACKUP_DIR/k8s-configmaps-\$DATE.yaml

# Backup k3s
tar czf \$BACKUP_DIR/k3s-\$DATE.tar.gz /var/lib/rancher/k3s /etc/rancher/k3s

# Keep only last 7 days
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find \$BACKUP_DIR -name "*.yaml" -mtime +7 -delete

echo "✅ Backup complete: \$DATE"
BACKUP_SCRIPT

chmod +x /opt/studio-s/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/studio-s/backup.sh >> /opt/studio-s/logs/backup.log 2>&1" | crontab -

# =============================================================================
# Create Deployment Helper Scripts
# =============================================================================

echo "📝 Creating helper scripts..."

# kubectl wrapper script
cat > /usr/local/bin/k <<'KUBECTL_SCRIPT'
#!/bin/bash
kubectl "\$@"
KUBECTL_SCRIPT
chmod +x /usr/local/bin/k

# Quick status script
cat > /usr/local/bin/studio-status <<'STATUS_SCRIPT'
#!/bin/bash
echo "════════════════════════════════════════════════════════════"
echo "Studio-S Cluster Status"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Nodes:"
kubectl get nodes
echo ""
echo "🚀 Pods (studio-s namespace):"
kubectl get pods -n studio-s
echo ""
echo "🌐 Ingresses:"
kubectl get ingress -n studio-s
echo ""
echo "💾 Resource Usage:"
kubectl top nodes
echo ""
kubectl top pods -n studio-s
STATUS_SCRIPT
chmod +x /usr/local/bin/studio-status

# =============================================================================
# System Optimization
# =============================================================================

echo "⚡ Optimizing system..."

# Increase file limits
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Kernel optimizations
cat >> /etc/sysctl.conf <<EOF
# Network optimizations
net.core.somaxconn = 32768
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# File system
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Kubernetes specific
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

sysctl -p

# =============================================================================
# Create MOTD (Message of the Day)
# =============================================================================

cat > /etc/motd <<'MOTD'
════════════════════════════════════════════════════════════
   Studio-S Kubernetes Cluster
   Powered by k3s
════════════════════════════════════════════════════════════

Quick Commands:
  studio-status          - View cluster status
  k get pods -n studio-s - List application pods
  k logs -f POD_NAME     - View pod logs
  k describe pod POD     - Detailed pod info

Monitoring:
  - Grafana: https://grafana.${domain}
  - ArgoCD: https://argocd.${domain}
  
Useful Locations:
  - Kubeconfig: /opt/k3s/kubeconfig.yaml
  - Backups: /opt/studio-s/backups/
  - Logs: /opt/studio-s/logs/

Documentation: https://docs.k3s.io

════════════════════════════════════════════════════════════
MOTD

# =============================================================================
# Final Steps
# =============================================================================

echo "🧹 Cleaning up..."
apt-get autoremove -y
apt-get clean

# Save installation info
cat > /opt/studio-s/install-info.txt <<EOF
Installation Date: $(date)
k3s Version: $(k3s --version)
Kubernetes Version: $(kubectl version --short)
Public IP: $(curl -s http://ifconfig.me)
Domain: ${domain}
Environment: ${environment}
EOF

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ VPS Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Cluster Information:"
echo "  Public IP: $(curl -s http://ifconfig.me)"
echo "  Domain: ${domain}"
echo "  k3s Version: $(k3s --version | head -n1)"
echo ""
echo "Access Points:"
echo "  ArgoCD: https://argocd.${domain}"
echo "  Grafana: https://grafana.${domain}"
echo "  Application: https://${domain}"
echo ""
echo "Next Steps:"
echo "  1. Download kubeconfig: scp root@$(curl -s http://ifconfig.me):/opt/k3s/kubeconfig.yaml ."
echo "  2. Set KUBECONFIG: export KUBECONFIG=./kubeconfig.yaml"
echo "  3. Verify: kubectl get nodes"
echo "  4. Deploy: kubectl apply -k k8s/overlays/production"
echo ""
echo "════════════════════════════════════════════════════════════"
`;

// =============================================================================
// Execute Setup on VPS
// =============================================================================

const setupVPS = new command.remote.Command("setup-vps", {
  connection: {
    host: vpsIp,
    user: vpsUser,
    privateKey: sshPrivateKey,
  },
  create: setupScript
    .replace(/\${domain}/g, domain)
    .replace(/\${environment}/g, environment)
    .replace(/\${enableArgoCD}/g, String(enableArgoCD))
    .replace(/\${enableMonitoring}/g, String(enableMonitoring))
    .replace(
      /\${databaseUrl}/g,
      databaseUrl.apply((v) => v),
    )
    .replace(
      /\${mongodbUri}/g,
      mongodbUri.apply((v) => v),
    )
    .replace(
      /\${jwtSecret}/g,
      jwtSecret.apply((v) => v),
    )
    .replace(
      /\${gatewaySecret}/g,
      gatewaySecret.apply((v) => v),
    )
    .replace(
      /\${argocdAdminPassword}/g,
      argocdAdminPassword.apply((v) => v),
    ),
});

// =============================================================================
// Fetch kubeconfig
// =============================================================================

const kubeconfig = new command.remote.Command(
  "get-kubeconfig",
  {
    connection: {
      host: vpsIp,
      user: vpsUser,
      privateKey: sshPrivateKey,
    },
    create: "cat /opt/k3s/kubeconfig.yaml",
  },
  { dependsOn: [setupVPS] },
);

// =============================================================================
// Cloudflare DNS Configuration
// =============================================================================

const zone = cloudflare.getZoneOutput({ name: domain });

// Root domain
new cloudflare.Record(`${projectName}-dns-root`, {
  zoneId: zone.id,
  name: "@",
  type: "A",
  value: vpsIp,
  proxied: false, // Must be false for Let's Encrypt
  ttl: 1,
});

// www subdomain
new cloudflare.Record(`${projectName}-dns-www`, {
  zoneId: zone.id,
  name: "www",
  type: "A",
  value: vpsIp,
  proxied: false,
  ttl: 1,
});

// ArgoCD subdomain
new cloudflare.Record(`${projectName}-dns-argocd`, {
  zoneId: zone.id,
  name: "argocd",
  type: "A",
  value: vpsIp,
  proxied: false,
  ttl: 1,
});

// Grafana subdomain
new cloudflare.Record(`${projectName}-dns-grafana`, {
  zoneId: zone.id,
  name: "grafana",
  type: "A",
  value: vpsIp,
  proxied: false,
  ttl: 1,
});

// Wildcard for preview environments
new cloudflare.Record(`${projectName}-dns-wildcard`, {
  zoneId: zone.id,
  name: "*",
  type: "A",
  value: vpsIp,
  proxied: false,
  ttl: 1,
});

// =============================================================================
// Outputs
// =============================================================================

export const vpsPublicIp = vpsIp;
export const sshCommand = `ssh ${vpsUser}@${vpsIp}`;
export const kubeconfigContent = kubeconfig.stdout;
export const kubeconfigCommand = pulumi.interpolate`scp ${vpsUser}@${vpsIp}:/opt/k3s/kubeconfig.yaml ./kubeconfig.yaml && export KUBECONFIG=$(pwd)/kubeconfig.yaml`;

export const argocdUrl = `https://argocd.${domain}`;
export const grafanaUrl = `https://grafana.${domain}`;
export const appUrl = `https://${domain}`;

export const nextSteps = `
╔══════════════════════════════════════════════════════════════╗
║  🎉 VPS Setup Complete!                                     ║
╚══════════════════════════════════════════════════════════════╝

1. Download kubeconfig:
   scp ${vpsUser}@${vpsIp}:/opt/k3s/kubeconfig.yaml ./kubeconfig.yaml
   export KUBECONFIG=$(pwd)/kubeconfig.yaml

2. Verify cluster:
   kubectl get nodes
   kubectl get pods -A

3. Access services:
   - ArgoCD: https://argocd.${domain}
   - Grafana: https://grafana.${domain}
   - Application: https://${domain}
   
   Username: admin
   Password: (set in Pulumi config)

4. Deploy application:
   kubectl apply -k k8s/overlays/production
   
5. Check status:
   ssh ${vpsUser}@${vpsIp}
   studio-status

📚 Save kubeconfig to GitHub Secrets:
   cat kubeconfig.yaml | base64 -w 0
   # Add as KUBECONFIG secret in GitHub
`;
