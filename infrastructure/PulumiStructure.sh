#!/bin/bash
# Project Structure Setup Script

# Create directory structure
mkdir -p infrastructure/{modules/{networking,compute,database,kubernetes},environments/{dev,staging,production}}
mkdir -p .github/workflows
mkdir -p k8s/{base,overlays/{dev,staging,production}}
mkdir -p argocd

# Create files
cat > infrastructure/package.json << 'EOF'
{
  "name": "studio-s-infrastructure",
  "version": "1.0.0",
  "description": "Infrastructure as Code for Studio S",
  "main": "index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "pulumi up --stack dev --yes",
    "staging": "pulumi up --stack staging --yes",
    "production": "pulumi up --stack production",
    "preview": "pulumi preview",
    "destroy:dev": "pulumi destroy --stack dev --yes",
    "destroy:staging": "pulumi destroy --stack staging --yes"
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

cat > infrastructure/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./bin",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": [
    "**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "bin"
  ]
}
EOF

cat > infrastructure/Pulumi.yaml << 'EOF'
name: studio-s-infrastructure
runtime: nodejs
description: Complete infrastructure for Studio S with EKS and ArgoCD

config:
  aws:region:
    description: AWS region for resources
    default: us-east-1
EOF

echo "✅ Project structure created!"
echo ""
echo "📁 Directory Structure:"
tree infrastructure/ -L 2 2>/dev/null || find infrastructure -type d