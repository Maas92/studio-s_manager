#!/bin/bash

# =============================================================================
# Complete Setup Script for Pulumi + GitHub Actions + ArgoCD
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Studio-S Complete Infrastructure Setup                      ║
║   Pulumi + GitHub Actions + ArgoCD + EKS                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# =============================================================================
# Prerequisites Check
# =============================================================================

echo -e "${YELLOW}Checking prerequisites...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 is installed${NC}"
        return 0
    fi
}

MISSING_DEPS=0

check_command "node" || MISSING_DEPS=1
check_command "npm" || MISSING_DEPS=1
check_command "docker" || MISSING_DEPS=1
check_command "git" || MISSING_DEPS=1
check_command "aws" || MISSING_DEPS=1

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}Please install missing dependencies first${NC}"
    exit 1
fi

# =============================================================================
# Install Pulumi
# =============================================================================

if ! command -v pulumi &> /dev/null; then
    echo -e "${YELLOW}Installing Pulumi...${NC}"
    curl -fsSL https://get.pulumi.com | sh
    export PATH=$PATH:$HOME/.pulumi/bin
    echo -e "${GREEN}✅ Pulumi installed${NC}"
else
    echo -e "${GREEN}✅ Pulumi already installed${NC}"
fi

# =============================================================================
# Install kubectl
# =============================================================================

if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}Installing kubectl...${NC}"
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl
    sudo mv kubectl /usr/local/bin/
    echo -e "${GREEN}✅ kubectl installed${NC}"
else
    echo -e "${GREEN}✅ kubectl already installed${NC}"
fi

# =============================================================================
# Install kustomize
# =============================================================================

if ! command -v kustomize &> /dev/null; then
    echo -e "${YELLOW}Installing kustomize...${NC}"
    curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
    sudo mv kustomize /usr/local/bin/
    echo -e "${GREEN}✅ kustomize installed${NC}"
else
    echo -e "${GREEN}✅ kustomize already installed${NC}"
fi

# =============================================================================
# Install ArgoCD CLI
# =============================================================================

if ! command -v argocd &> /dev/null; then
    echo -e "${YELLOW}Installing ArgoCD CLI...${NC}"
    curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    chmod +x argocd
    sudo mv argocd /usr/local/bin/
    echo -e "${GREEN}✅ ArgoCD CLI installed${NC}"
else
    echo -e "${GREEN}✅ ArgoCD CLI already installed${NC}"
fi

# =============================================================================
# Configure AWS
# =============================================================================

echo ""
echo -e "${BLUE}=== AWS Configuration ===${NC}"

if [ ! -f ~/.aws/credentials ]; then
    echo -e "${YELLOW}AWS credentials not found. Configuring...${NC}"
    aws configure
else
    echo -e "${GREEN}✅ AWS already configured${NC}"
    echo -e "${YELLOW}Current AWS identity:${NC}"
    aws sts get-caller-identity
fi

# =============================================================================
# Setup Pulumi
# =============================================================================

echo ""
echo -e "${BLUE}=== Pulumi Setup ===${NC}"

read -p "Do you have a Pulumi account? (y/n): " HAS_PULUMI_ACCOUNT

if [ "$HAS_PULUMI_ACCOUNT" != "y" ]; then
    echo -e "${YELLOW}Creating Pulumi account...${NC}"
    echo "Please visit: https://app.pulumi.com/signup"
    read -p "Press enter after creating your account..."
fi

read -p "Enter your Pulumi access token: " PULUMI_ACCESS_TOKEN
export PULUMI_ACCESS_TOKEN=$PULUMI_ACCESS_TOKEN

# Login to Pulumi
pulumi login

# =============================================================================
# Create Project Structure
# =============================================================================

echo ""
echo -e "${BLUE}=== Creating Project Structure ===${NC}"

# Create directories
mkdir -p infrastructure/{modules/{networking,compute,database,kubernetes},environments/{dev,staging,production}}
mkdir -p .github/workflows
mkdir -p k8s/{base,overlays/{dev,staging,production}}
mkdir -p argocd

echo -e "${GREEN}✅ Directory structure created${NC}"

# =============================================================================
# Initialize Pulumi Project
# =============================================================================

echo ""
echo -e "${BLUE}=== Initializing Pulumi Project ===${NC}"

cd infrastructure

# Create package.json
cat > package.json << 'EOF'
{
  "name": "studio-s-infrastructure",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "pulumi up --stack dev",
    "staging": "pulumi up --stack staging",
    "production": "pulumi up --stack production"
  },
  "dependencies": {
    "@pulumi/pulumi": "^3.100.0",
    "@pulumi/aws": "^6.15.0",
    "@pulumi/awsx": "^2.4.0",
    "@pulumi/eks": "^2.0.0",
    "@pulumi/kubernetes": "^4.5.0",
    "@pulumi/cloudflare": "^5.15.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
EOF

# Install dependencies
echo -e "${YELLOW}Installing Pulumi dependencies...${NC}"
npm install

# Initialize Pulumi stack
echo -e "${YELLOW}Initializing Pulumi stacks...${NC}"

read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN
read -p "Enter your Cloudflare API token: " CF_TOKEN
read -sp "Enter database password: " DB_PASSWORD
echo ""
read -sp "Enter ArgoCD admin password: " ARGOCD_PASSWORD
echo ""

# Create production stack
pulumi stack init production --non-interactive || pulumi stack select production

# Set configuration
pulumi config set aws:region us-east-1
pulumi config set domain $DOMAIN
pulumi config set --secret dbPassword $DB_PASSWORD
pulumi config set --secret argocdAdminPassword $ARGOCD_PASSWORD
pulumi config set enableArgoCD true
pulumi config set gitRepoUrl "https://github.com/$(git config user.name)/studio-s.git"

# Generate SSH key for EC2 if not exists
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo -e "${YELLOW}Generating SSH key...${NC}"
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
fi

pulumi config set sshPublicKey "$(cat ~/.ssh/id_rsa.pub)"

cd ..

echo -e "${GREEN}✅ Pulumi project initialized${NC}"

# =============================================================================
# Setup GitHub Repository
# =============================================================================

echo ""
echo -e "${BLUE}=== GitHub Setup ===${NC}"

# Check if git repo exists
if [ ! -d .git ]; then
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit: Pulumi + ArgoCD + GitHub Actions"
fi

echo ""
echo -e "${YELLOW}GitHub Secrets to Add:${NC}"
echo -e "Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo ""
echo -e "${GREEN}Required Secrets:${NC}"
echo "1. AWS_ACCESS_KEY_ID"
echo "2. AWS_SECRET_ACCESS_KEY"
echo "3. PULUMI_ACCESS_TOKEN: $PULUMI_ACCESS_TOKEN"
echo "4. CLOUDFLARE_API_TOKEN: $CF_TOKEN"
echo "5. ARGOCD_SERVER: (will be available after deployment)"
echo "6. ARGOCD_PASSWORD: $ARGOCD_PASSWORD"
echo "7. PAT_TOKEN: (GitHub Personal Access Token)"
echo ""

read -p "Press enter after adding GitHub secrets..."

# =============================================================================
# Deploy Infrastructure
# =============================================================================

echo ""
echo -e "${BLUE}=== Deploying Infrastructure ===${NC}"

read -p "Deploy infrastructure now? (y/n): " DEPLOY_NOW

if [ "$DEPLOY_NOW" == "y" ]; then
    cd infrastructure
    
    echo -e "${YELLOW}Running pulumi up...${NC}"
    pulumi up --yes
    
    # Export kubeconfig
    pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    export KUBECONFIG=$(pwd)/kubeconfig.yaml
    
    echo -e "${GREEN}✅ Infrastructure deployed${NC}"
    
    # Get outputs
    echo ""
    echo -e "${GREEN}=== Deployment Outputs ===${NC}"
    pulumi stack output
    
    cd ..
fi

# =============================================================================
# Configure kubectl
# =============================================================================

echo ""
echo -e "${BLUE}=== Configuring kubectl ===${NC}"

if [ -f infrastructure/kubeconfig.yaml ]; then
    export KUBECONFIG=$(pwd)/infrastructure/kubeconfig.yaml
    
    echo -e "${YELLOW}Testing cluster connection...${NC}"
    kubectl cluster-info
    kubectl get nodes
    
    echo -e "${GREEN}✅ kubectl configured${NC}"
fi

# =============================================================================
# Setup ArgoCD
# =============================================================================

echo ""
echo -e "${BLUE}=== ArgoCD Setup ===${NC}"

if [ -f infrastructure/kubeconfig.yaml ]; then
    echo -e "${YELLOW}Waiting for ArgoCD to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=600s deployment/argocd-server -n argocd || true
    
    # Get ArgoCD server URL
    ARGOCD_SERVER=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [ -n "$ARGOCD_SERVER" ]; then
        echo -e "${GREEN}ArgoCD Server: https://$ARGOCD_SERVER${NC}"
        echo -e "${GREEN}Username: admin${NC}"
        echo -e "${GREEN}Password: $ARGOCD_PASSWORD${NC}"
        
        # Login to ArgoCD
        argocd login $ARGOCD_SERVER --username admin --password $ARGOCD_PASSWORD --insecure
        
        echo -e "${GREEN}✅ ArgoCD configured${NC}"
    fi
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎉 Setup Complete!                                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Push code to GitHub:"
echo "   git remote add origin YOUR_REPO_URL"
echo "   git push -u origin main"
echo ""
echo "2. Access ArgoCD:"
echo "   URL: https://argocd.$DOMAIN"
echo "   Username: admin"
echo "   Password: [saved in secrets]"
echo ""
echo "3. Monitor deployments:"
echo "   kubectl get pods -n studio-s"
echo "   kubectl logs -f deployment/gateway -n studio-s"
echo ""
echo "4. Access your application:"
echo "   https://$DOMAIN"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "- Pulumi: https://www.pulumi.com/docs/"
echo "- ArgoCD: https://argo-cd.readthedocs.io/"
echo "- EKS: https://docs.aws.amazon.com/eks/"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"