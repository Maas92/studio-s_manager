import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

// =============================================================================
// Configuration
// Pulumi's only job here is Cloudflare DNS.
// All server setup (k3s, ArgoCD, nginx, etc.) is handled by Ansible.
// =============================================================================

const config = new pulumi.Config();
const projectName = "studio-s";
const environment = pulumi.getStack();

const vpsIp = config.require("vpsIp");
const vpsUser = config.get("vpsUser") || "root";
const domain = config.require("domain");

// =============================================================================
// Cloudflare DNS Records
// =============================================================================

const zone = cloudflare.getZoneOutput({ filter: { name: domain } });

// Root domain
new cloudflare.DnsRecord(`${projectName}-dns-root`, {
  zoneId: zone.id,
  name: "@",
  type: "A",
  content: vpsIp,
  proxied: false, // Must be false for Let's Encrypt HTTP-01 challenges
  ttl: 1,
});

// www
new cloudflare.DnsRecord(`${projectName}-dns-www`, {
  zoneId: zone.id,
  name: "www",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

// ArgoCD
new cloudflare.DnsRecord(`${projectName}-dns-argocd`, {
  zoneId: zone.id,
  name: "argocd",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

// Grafana
new cloudflare.DnsRecord(`${projectName}-dns-grafana`, {
  zoneId: zone.id,
  name: "grafana",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

// Wildcard — covers PR preview environments (pr-42.studiosbeautybar.com etc.)
new cloudflare.DnsRecord(`${projectName}-dns-wildcard`, {
  zoneId: zone.id,
  name: "*",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

new cloudflare.DnsRecord(`${projectName}-dns-temporal`, {
  zoneId: zone.id,
  name: "temporal",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

new cloudflare.DnsRecord(`${projectName}-dns-app`, {
  zoneId: zone.id,
  name: "app",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

new cloudflare.DnsRecord(`${projectName}-dns-prometheus`, {
  zoneId: zone.id,
  name: "prometheus",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

new cloudflare.DnsRecord(`${projectName}-dns-portainer`, {
  zoneId: zone.id,
  name: "portainer",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

new cloudflare.DnsRecord(`${projectName}-dns-ops`, {
  zoneId: zone.id,
  name: "ops",
  type: "A",
  content: vpsIp,
  proxied: false,
  ttl: 1,
});

// =============================================================================
// Outputs
// =============================================================================

export const vpsPublicIp = vpsIp;
export const sshCommand = `ssh ${vpsUser}@${vpsIp}`;
export const argocdUrl = `https://argocd.${domain}`;
export const grafanaUrl = `https://grafana.${domain}`;
export const appUrl = `https://$app.{domain}`;
export const temporalUrl = `https://temporal.${domain}`;
export const prometheusUrl = `https://prometheus.${domain}`;
export const portainerUrl = `https://portainer.${domain}`;
export const opsUrl = `https://ops.${domain}`;

export const nextSteps = `
╔══════════════════════════════════════════════════════════════╗
║  DNS records created. Now run Ansible to set up the server. ║
╚══════════════════════════════════════════════════════════════╝

1. Run Ansible (from infrastructure/ansible/):
   ansible-playbook -i inventory.yml playbooks/bootstrap.yml
   ansible-playbook -i inventory.yml playbooks/k3s.yml
   ansible-playbook -i inventory.yml playbooks/cluster-tools.yml
   ansible-playbook -i inventory.yml playbooks/argocd.yml

2. Get kubeconfig after Ansible finishes:
   scp ${vpsUser}@${vpsIp}:/opt/k3s/kubeconfig.yaml ./kubeconfig.yaml
   export KUBECONFIG=$(pwd)/kubeconfig.yaml

3. Verify cluster:
   kubectl get nodes
   kubectl get pods -A

4. Access services:
   ArgoCD:  https://argocd.${domain}  (admin / your ARGOCD_ADMIN_PASSWORD)
   Grafana: https://grafana.${domain}
   App:     https://${domain}
   Temporal: https://temporal.${domain}
`;
