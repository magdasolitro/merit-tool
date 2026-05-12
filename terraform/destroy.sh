#!/usr/bin/env bash
# destroy.sh — Tear down the X-REG GCP infrastructure managed by Terraform.
# Destroys the VM, firewall rules, network — everything managed by Terraform.
#
# ⚠️  WARNING: All data on the VM will be lost.
#
# Usage (from the repository root):
#   bash terraform/destroy.sh
#
set -euo pipefail

# ─── Load secrets from .env ─────────────────────────────────────────────────
REPO_ROOT="$(git rev-parse --show-toplevel)"
ENV_FILE="$REPO_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ─── Export Terraform variables from .env ───────────────────────────────────
export TF_VAR_ssh_username="${SSH_USER:?SSH_USER is not set in .env}"
export TF_VAR_ssh_public_key_path="${SSH_KEY:?SSH_KEY is not set in .env}.pub"
export TF_VAR_app_image="${APP_IMAGE:-xreg:latest}"
export TF_VAR_app_internal_port="${APP_INTERNAL_PORT:-3000}"
export TF_VAR_app_deploy_dir="${APP_DEPLOY_DIR:-/home/xreg-app}"

# ─── GCP credentials check ──────────────────────────────────────────────────
if ! gcloud auth application-default print-access-token &>/dev/null; then
  echo "GCP credentials not found or expired. Launching Google login..."
  gcloud auth application-default login
fi

# ─── Show what will be destroyed ────────────────────────────────────────────
cd "$REPO_ROOT/terraform"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ⚠️   X-REG INFRASTRUCTURE DESTROY                   ║"
echo "║                                                      ║"
echo "║  This will permanently delete:                       ║"
echo "║    • The GCP VM instance                             ║"
echo "║    • All firewall rules                              ║"
echo "║    • The VPC network                                 ║"
echo "║    • ALL DATA on the VM                              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

terraform plan -destroy -input=false

echo ""
read -rp "Type 'yes' to confirm destruction: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Destroy cancelled."
  exit 0
fi

# ─── Destroy ────────────────────────────────────────────────────────────────
echo ""
echo "=== Destroying infrastructure... ==="
terraform destroy -input=false -auto-approve

echo ""
echo "=== Done. All resources have been destroyed. ==="

