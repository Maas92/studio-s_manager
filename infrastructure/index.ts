// infrastructure/index.ts
// Install: npm install @pulumi/pulumi @pulumi/aws @pulumi/digitalocean @pulumi/cloudflare

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as digitalocean from "@pulumi/digitalocean";
import * as cloudflare from "@pulumi/cloudflare";

// Configuration
const config = new pulumi.Config();
const domain = config.require("domain"); // yourdomain.com
const environment = pulumi.getStack(); // dev, staging, production
const projectName = "studio-s";

// =============================================================================
// 1. VPC and Networking (AWS)
// =============================================================================

const vpc = new aws.ec2.Vpc(`${projectName}-vpc`, {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    Name: `${projectName}-${environment}`,
    Environment: environment,
  },
});

const publicSubnet = new aws.ec2.Subnet(`${projectName}-public-subnet`, {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: "us-east-1a",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: `${projectName}-public-${environment}`,
  },
});

const privateSubnet = new aws.ec2.Subnet(`${projectName}-private-subnet`, {
  vpcId: vpc.id,
  cidrBlock: "10.0.2.0/24",
  availabilityZone: "us-east-1b",
  tags: {
    Name: `${projectName}-private-${environment}`,
  },
});

const igw = new aws.ec2.InternetGateway(`${projectName}-igw`, {
  vpcId: vpc.id,
  tags: {
    Name: `${projectName}-${environment}`,
  },
});

const routeTable = new aws.ec2.RouteTable(`${projectName}-rt`, {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    },
  ],
  tags: {
    Name: `${projectName}-${environment}`,
  },
});

new aws.ec2.RouteTableAssociation(`${projectName}-rta`, {
  subnetId: publicSubnet.id,
  routeTableId: routeTable.id,
});

// =============================================================================
// 2. Security Groups
// =============================================================================

const appSecurityGroup = new aws.ec2.SecurityGroup(`${projectName}-app-sg`, {
  vpcId: vpc.id,
  description: "Security group for application servers",
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] }, // SSH
    { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }, // HTTP
    { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] }, // HTTPS
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    Name: `${projectName}-app-${environment}`,
  },
});

const dbSecurityGroup = new aws.ec2.SecurityGroup(`${projectName}-db-sg`, {
  vpcId: vpc.id,
  description: "Security group for databases",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      securityGroups: [appSecurityGroup.id],
    }, // PostgreSQL
    {
      protocol: "tcp",
      fromPort: 6379,
      toPort: 6379,
      securityGroups: [appSecurityGroup.id],
    }, // Redis
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    Name: `${projectName}-db-${environment}`,
  },
});

// =============================================================================
// 3. RDS PostgreSQL Database
// =============================================================================

const dbSubnetGroup = new aws.rds.SubnetGroup(
  `${projectName}-db-subnet-group`,
  {
    subnetIds: [publicSubnet.id, privateSubnet.id],
    tags: {
      Name: `${projectName}-${environment}`,
    },
  }
);

const db = new aws.rds.Instance(`${projectName}-postgres`, {
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
  tags: {
    Name: `${projectName}-${environment}`,
  },
});

// =============================================================================
// 4. ElastiCache Redis
// =============================================================================

const redisSubnetGroup = new aws.elasticache.SubnetGroup(
  `${projectName}-redis-subnet-group`,
  {
    subnetIds: [publicSubnet.id, privateSubnet.id],
    tags: {
      Name: `${projectName}-${environment}`,
    },
  }
);

const redis = new aws.elasticache.Cluster(`${projectName}-redis`, {
  engine: "redis",
  engineVersion: "7.0",
  nodeType: environment === "production" ? "cache.t3.small" : "cache.t3.micro",
  numCacheNodes: 1,
  parameterGroupName: "default.redis7",
  subnetGroupName: redisSubnetGroup.name,
  securityGroupIds: [dbSecurityGroup.id],
  tags: {
    Name: `${projectName}-${environment}`,
  },
});

// =============================================================================
// 5. EC2 Instance (Application Server)
// =============================================================================

// Use latest Ubuntu AMI
const ubuntu = aws.ec2.getAmi({
  mostRecent: true,
  filters: [
    {
      name: "name",
      values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"],
    },
    { name: "virtualization-type", values: ["hvm"] },
  ],
  owners: ["099720109477"], // Canonical
});

// Create SSH key pair
const sshKey = new aws.ec2.KeyPair(`${projectName}-key`, {
  publicKey: config.require("sshPublicKey"),
  tags: {
    Name: `${projectName}-${environment}`,
  },
});

// User data script to install Docker
const userData = `#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/studio-s
chown ubuntu:ubuntu /opt/studio-s

# Install monitoring tools
apt-get install -y htop iotop nethogs

echo "Setup complete" > /var/log/userdata.log
`;

const appServer = new aws.ec2.Instance(`${projectName}-app`, {
  instanceType: environment === "production" ? "t3.medium" : "t3.small",
  ami: ubuntu.then((ami) => ami.id),
  keyName: sshKey.keyName,
  subnetId: publicSubnet.id,
  vpcSecurityGroupIds: [appSecurityGroup.id],
  userData: userData,
  rootBlockDevice: {
    volumeSize: 30,
    volumeType: "gp3",
    encrypted: true,
  },
  tags: {
    Name: `${projectName}-${environment}`,
    Environment: environment,
  },
});

// Elastic IP for the app server
const eip = new aws.ec2.Eip(`${projectName}-eip`, {
  instance: appServer.id,
  tags: {
    Name: `${projectName}-${environment}`,
  },
});

// =============================================================================
// 6. S3 Buckets for Backups and Static Assets
// =============================================================================

const backupBucket = new aws.s3.Bucket(
  `${projectName}-backups-${environment}`,
  {
    acl: "private",
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
    tags: {
      Name: `${projectName}-backups-${environment}`,
    },
  }
);

const staticAssetsBucket = new aws.s3.Bucket(
  `${projectName}-assets-${environment}`,
  {
    acl: "private",
    corsRules: [
      {
        allowedHeaders: ["*"],
        allowedMethods: ["GET", "HEAD"],
        allowedOrigins: [`https://${domain}`, `https://www.${domain}`],
        exposeHeaders: ["ETag"],
        maxAgeSeconds: 3000,
      },
    ],
    tags: {
      Name: `${projectName}-assets-${environment}`,
    },
  }
);

// CloudFront distribution for static assets
const cdn = new aws.cloudfront.Distribution(`${projectName}-cdn`, {
  origins: [
    {
      domainName: staticAssetsBucket.bucketRegionalDomainName,
      originId: "S3-static-assets",
      s3OriginConfig: {
        originAccessIdentity: new aws.cloudfront.OriginAccessIdentity(
          `${projectName}-oai`
        ).cloudfrontAccessIdentityPath,
      },
    },
  ],
  enabled: true,
  defaultCacheBehavior: {
    targetOriginId: "S3-static-assets",
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD"],
    forwardedValues: {
      queryString: false,
      cookies: {
        forward: "none",
      },
    },
    minTtl: 0,
    defaultTtl: 3600,
    maxTtl: 86400,
  },
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
  tags: {
    Name: `${projectName}-${environment}`,
  },
});

// =============================================================================
// 7. Cloudflare DNS Configuration
// =============================================================================

const zone = cloudflare.getZoneOutput({
  name: domain,
});

// A record for main domain
new cloudflare.Record(`${projectName}-dns-root`, {
  zoneId: zone.id,
  name: "@",
  type: "A",
  value: eip.publicIp,
  proxied: true, // Enable Cloudflare proxy
});

// A record for www subdomain
new cloudflare.Record(`${projectName}-dns-www`, {
  zoneId: zone.id,
  name: "www",
  type: "A",
  value: eip.publicIp,
  proxied: true,
});

// A record for Traefik dashboard
new cloudflare.Record(`${projectName}-dns-traefik`, {
  zoneId: zone.id,
  name: "traefik",
  type: "A",
  value: eip.publicIp,
  proxied: true,
});

// A record for Grafana
new cloudflare.Record(`${projectName}-dns-grafana`, {
  zoneId: zone.id,
  name: "grafana",
  type: "A",
  value: eip.publicIp,
  proxied: true,
});

// A record for Prometheus
new cloudflare.Record(`${projectName}-dns-prometheus`, {
  zoneId: zone.id,
  name: "prometheus",
  type: "A",
  value: eip.publicIp,
  proxied: true,
});

// =============================================================================
// 8. IAM Roles for Backups
// =============================================================================

const backupRole = new aws.iam.Role(`${projectName}-backup-role`, {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ec2.amazonaws.com",
        },
      },
    ],
  }),
});

const backupPolicy = new aws.iam.RolePolicy(`${projectName}-backup-policy`, {
  role: backupRole.id,
  policy: pulumi.all([backupBucket.arn]).apply(([bucketArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
          Resource: [bucketArn, `${bucketArn}/*`],
        },
      ],
    })
  ),
});

const instanceProfile = new aws.iam.InstanceProfile(
  `${projectName}-instance-profile`,
  {
    role: backupRole.name,
  }
);

// =============================================================================
// Exports
// =============================================================================

export const vpcId = vpc.id;
export const publicSubnetId = publicSubnet.id;
export const appServerPublicIp = eip.publicIp;
export const databaseEndpoint = db.endpoint;
export const databaseUsername = db.username;
export const redisEndpoint = redis.cacheNodes[0].address;
export const backupBucketName = backupBucket.id;
export const cdnDomainName = cdn.domainName;
export const sshCommand = pulumi.interpolate`ssh -i ~/.ssh/id_rsa ubuntu@${eip.publicIp}`;

// Connection strings for .env
export const postgresConnectionString = pulumi.interpolate`postgresql://${
  db.username
}:${config.requireSecret("dbPassword")}@${db.endpoint}/${db.dbName}`;
export const redisConnectionString = pulumi.interpolate`redis://${redis.cacheNodes[0].address}:6379`;
