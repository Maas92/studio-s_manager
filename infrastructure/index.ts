// Install: npm install @pulumi/pulumi @pulumi/aws @pulumi/digitalocean @pulumi/cloudflare

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as cloudflare from "@pulumi/cloudflare";

// =============================================================================
// Configuration
// =============================================================================

const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");

const projectName = "studio-s";
const environment = pulumi.getStack();
const region = awsConfig.require("region");
const domain = config.require("domain");
const enableArgoCD = config.getBoolean("enableArgoCD") ?? true;

// Tags for all resources
const tags = {
  Project: projectName,
  Environment: environment,
  ManagedBy: "Pulumi",
  Stack: pulumi.getStack(),
};

// =============================================================================
// VPC and Networking
// =============================================================================

const vpc = new awsx.ec2.Vpc(`${projectName}-vpc`, {
  cidrBlock: "10.0.0.0/16",
  numberOfAvailabilityZones: 2,
  enableDnsHostnames: true,
  enableDnsSupport: true,
  subnetStrategy: "Auto",
  subnetSpecs: [
    {
      type: awsx.ec2.SubnetType.Public,
      cidrMask: 24,
    },
    {
      type: awsx.ec2.SubnetType.Private,
      cidrMask: 24,
    },
  ],
  natGateways: {
    strategy:
      environment === "production"
        ? awsx.ec2.NatGatewayStrategy.OnePerAz
        : awsx.ec2.NatGatewayStrategy.Single,
  },
  tags,
});

// =============================================================================
// EKS Cluster
// =============================================================================

const cluster = new eks.Cluster(`${projectName}-eks`, {
  vpcId: vpc.vpcId,
  publicSubnetIds: vpc.publicSubnetIds,
  privateSubnetIds: vpc.privateSubnetIds,
  instanceType: environment === "production" ? "t3.medium" : "t3.small",
  desiredCapacity: environment === "production" ? 3 : 2,
  minSize: environment === "production" ? 2 : 1,
  maxSize: environment === "production" ? 10 : 5,
  enabledClusterLogTypes: [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler",
  ],
  tags,
  createOidcProvider: true,
});

// Export kubeconfig
export const kubeconfig = cluster.kubeconfig;

// Create Kubernetes provider
const k8sProvider = new k8s.Provider(
  `${projectName}-k8s-provider`,
  {
    kubeconfig: cluster.kubeconfig.apply(JSON.stringify),
  },
  { dependsOn: [cluster] }
);

// =============================================================================
// RDS PostgreSQL
// =============================================================================

const dbSubnetGroup = new aws.rds.SubnetGroup(`${projectName}-db-subnet`, {
  subnetIds: vpc.privateSubnetIds,
  tags,
});

const dbSecurityGroup = new aws.ec2.SecurityGroup(`${projectName}-db-sg`, {
  vpcId: vpc.vpcId,
  description: "Security group for RDS PostgreSQL",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      cidrBlocks: ["10.0.0.0/16"],
      description: "PostgreSQL from VPC",
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags,
});

const db = new aws.rds.Instance(`${projectName}-postgres`, {
  identifier: `${projectName}-${environment}`,
  allocatedStorage: 20,
  engine: "postgres",
  engineVersion: "15.3",
  instanceClass: environment === "production" ? "db.t3.small" : "db.t3.micro",
  dbName: projectName.replace(/-/g, "_"),
  username: "dbadmin",
  password: config.requireSecret("dbPassword"),
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  skipFinalSnapshot: environment !== "production",
  backupRetentionPeriod: environment === "production" ? 7 : 1,
  multiAz: environment === "production",
  storageEncrypted: true,
  tags,
});

// =============================================================================
// ElastiCache Redis
// =============================================================================

const redisSubnetGroup = new aws.elasticache.SubnetGroup(
  `${projectName}-redis-subnet`,
  {
    subnetIds: vpc.privateSubnetIds,
    tags,
  }
);

const redisSecurityGroup = new aws.ec2.SecurityGroup(
  `${projectName}-redis-sg`,
  {
    vpcId: vpc.vpcId,
    description: "Security group for ElastiCache Redis",
    ingress: [
      {
        protocol: "tcp",
        fromPort: 6379,
        toPort: 6379,
        cidrBlocks: ["10.0.0.0/16"],
        description: "Redis from VPC",
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags,
  }
);

const redis = new aws.elasticache.Cluster(`${projectName}-redis`, {
  clusterId: `${projectName}-${environment}`,
  engine: "redis",
  engineVersion: "7.0",
  nodeType: environment === "production" ? "cache.t3.small" : "cache.t3.micro",
  numCacheNodes: 1,
  parameterGroupName: "default.redis7",
  subnetGroupName: redisSubnetGroup.name,
  securityGroupIds: [redisSecurityGroup.id],
  tags,
});

// =============================================================================
// S3 Buckets
// =============================================================================

const backupBucket = new aws.s3.Bucket(
  `${projectName}-backups-${environment}`,
  {
    versioning: {
      enabled: true,
    },
    lifecycleRules: [
      {
        enabled: true,
        expiration: {
          days: 90,
        },
      },
    ],
    serverSideEncryptionConfiguration: {
      rule: {
        applyServerSideEncryptionByDefault: {
          sseAlgorithm: "AES256",
        },
      },
    },
    tags,
  }
);

// =============================================================================
// Kubernetes Namespaces
// =============================================================================

const appNamespace = new k8s.core.v1.Namespace(
  `${projectName}-app`,
  {
    metadata: {
      name: projectName,
      labels: tags,
    },
  },
  { provider: k8sProvider }
);

const argocdNamespace = new k8s.core.v1.Namespace(
  "argocd",
  {
    metadata: {
      name: "argocd",
      labels: tags,
    },
  },
  { provider: k8sProvider }
);

// =============================================================================
// Kubernetes Secrets (Database credentials)
// =============================================================================

const dbSecret = new k8s.core.v1.Secret(
  `${projectName}-db-secret`,
  {
    metadata: {
      namespace: appNamespace.metadata.name,
      name: "database-credentials",
    },
    type: "Opaque",
    stringData: {
      host: db.endpoint.apply((e) => e.split(":")[0]),
      port: "5432",
      database: db.dbName,
      username: db.username,
      password: config.requireSecret("dbPassword"),
      connectionString: pulumi.interpolate`postgresql://${
        db.username
      }:${config.requireSecret("dbPassword")}@${db.endpoint}/${db.dbName}`,
    },
  },
  { provider: k8sProvider }
);

const redisSecret = new k8s.core.v1.Secret(
  `${projectName}-redis-secret`,
  {
    metadata: {
      namespace: appNamespace.metadata.name,
      name: "redis-credentials",
    },
    type: "Opaque",
    stringData: {
      host: redis.cacheNodes[0].address,
      port: "6379",
      connectionString: pulumi.interpolate`redis://${redis.cacheNodes[0].address}:6379`,
    },
  },
  { provider: k8sProvider }
);

// =============================================================================
// AWS Load Balancer Controller (for ingress)
// =============================================================================

const albControllerServiceAccount = new eks.ServiceAccount(
  "aws-load-balancer-controller",
  {
    namespace: "kube-system",
    cluster: cluster.core,
  },
  { provider: k8sProvider }
);

const albController = new k8s.helm.v3.Chart(
  "aws-load-balancer-controller",
  {
    chart: "aws-load-balancer-controller",
    namespace: "kube-system",
    fetchOpts: {
      repo: "https://aws.github.io/eks-charts",
    },
    values: {
      clusterName: cluster.eksCluster.name,
      serviceAccount: {
        create: false,
        name: albControllerServiceAccount.serviceAccount.metadata.name,
      },
    },
  },
  { provider: k8sProvider, dependsOn: [albControllerServiceAccount] }
);

// =============================================================================
// ArgoCD Installation
// =============================================================================

let argocd: k8s.helm.v3.Chart | undefined;

if (enableArgoCD) {
  argocd = new k8s.helm.v3.Chart(
    "argocd",
    {
      chart: "argo-cd",
      namespace: argocdNamespace.metadata.name,
      fetchOpts: {
        repo: "https://argoproj.github.io/argo-helm",
      },
      values: {
        global: {
          domain: `argocd.${domain}`,
        },
        server: {
          service: {
            type: "LoadBalancer",
            annotations: {
              "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
              "service.beta.kubernetes.io/aws-load-balancer-scheme":
                "internet-facing",
            },
          },
          ingress: {
            enabled: true,
            ingressClassName: "alb",
            annotations: {
              "alb.ingress.kubernetes.io/scheme": "internet-facing",
              "alb.ingress.kubernetes.io/target-type": "ip",
              "alb.ingress.kubernetes.io/certificate-arn":
                config.get("certificateArn"),
            },
            hosts: [`argocd.${domain}`],
          },
          extraArgs: [
            "--insecure", // Use ALB for SSL termination
          ],
        },
        configs: {
          secret: {
            argocdServerAdminPassword: config.requireSecret(
              "argocdAdminPassword"
            ),
          },
        },
      },
    },
    { provider: k8sProvider, dependsOn: [argocdNamespace, albController] }
  );
}

// =============================================================================
// ArgoCD Application CRD (GitOps)
// =============================================================================

if (argocd) {
  const argocdApp = new k8s.apiextensions.CustomResource(
    "studio-s-app",
    {
      apiVersion: "argoproj.io/v1alpha1",
      kind: "Application",
      metadata: {
        name: `${projectName}-${environment}`,
        namespace: "argocd",
      },
      spec: {
        project: "default",
        source: {
          repoURL: config.require("gitRepoUrl"),
          targetRevision: environment === "production" ? "main" : environment,
          path: `k8s/overlays/${environment}`,
        },
        destination: {
          server: "https://kubernetes.default.svc",
          namespace: projectName,
        },
        syncPolicy: {
          automated: {
            prune: true,
            selfHeal: true,
            allowEmpty: false,
          },
          syncOptions: ["CreateNamespace=true"],
        },
      },
    },
    { provider: k8sProvider, dependsOn: [argocd] }
  );
}

// =============================================================================
// Cloudflare DNS
// =============================================================================

const zone = cloudflare.getZoneOutput({
  name: domain,
});

// Get ALB hostname
const albHostname = argocd
  ?.getResourceProperty("v1/Service", "argocd/argocd-server", "status")
  .apply((status: any) => status.loadBalancer.ingress[0].hostname);

if (albHostname) {
  new cloudflare.Record(`${projectName}-argocd-dns`, {
    zoneId: zone.id,
    name: "argocd",
    type: "CNAME",
    value: albHostname,
    proxied: true,
  });

  new cloudflare.Record(`${projectName}-app-dns`, {
    zoneId: zone.id,
    name: "@",
    type: "CNAME",
    value: albHostname,
    proxied: true,
  });

  new cloudflare.Record(`${projectName}-www-dns`, {
    zoneId: zone.id,
    name: "www",
    type: "CNAME",
    value: albHostname,
    proxied: true,
  });
}

// =============================================================================
// Outputs
// =============================================================================

export const vpcId = vpc.vpcId;
export const clusterName = cluster.eksCluster.name;
export const clusterEndpoint = cluster.eksCluster.endpoint;
export const databaseEndpoint = db.endpoint;
export const redisEndpoint = redis.cacheNodes[0].address;
export const backupBucketName = backupBucket.id;
export const argocdUrl = pulumi.interpolate`https://argocd.${domain}`;
export const appUrl = pulumi.interpolate`https://${domain}`;

// Connection strings (use in GitHub Secrets)
export const postgresConnectionString = pulumi.interpolate`postgresql://${
  db.username
}:${config.requireSecret("dbPassword")}@${db.endpoint}/${db.dbName}`;
export const redisConnectionString = pulumi.interpolate`redis://${redis.cacheNodes[0].address}:6379`;
