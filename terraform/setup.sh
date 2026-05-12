#!/usr/bin/env bash
# setup.sh — Build the x-reg image, provision GCP with Terraform, SCP image, start Compose.
# Run from the repository root: bash terraform/setup.sh
set -euo pipefail

# ─── Load .env ─────────────────────────────────────────────────────────────
REPO_ROOT="$(git rev-parse --show-toplevel)"
ENV_FILE="$REPO_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example to .env and fill SSH_* (and optional XREG_*)."
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ─── GCP Authentication ─────────────────────────────────────────────────────
if ! gcloud auth application-default print-access-token &>/dev/null; then
  echo "GCP credentials not found or expired. Launching Google login..."
  gcloud auth application-default login
  echo "Login successful."
else
  echo "GCP credentials OK."
fi

gcloud config set project "${GCP_PROJECT_ID:-$(grep 'project_id' "$REPO_ROOT/terraform/terraform.tfvars" | cut -d'"' -f2)}" --quiet

# ─── Terraform variables from .env ───────────────────────────────────────────
export TF_VAR_ssh_username="${SSH_USER:?SSH_USER is not set in .env}"
export TF_VAR_ssh_public_key_path="${SSH_KEY:?SSH_KEY is not set in .env}.pub"
export TF_VAR_app_image="${APP_IMAGE:-xreg:latest}"
export TF_VAR_app_internal_port="${APP_INTERNAL_PORT:-3000}"
export TF_VAR_app_deploy_dir="${APP_DEPLOY_DIR:-/home/xreg-app}"

# ─── x-reg Docker build ─────────────────────────────────────────────────────
XREG_PROJECT_ROOT="${XREG_PROJECT_ROOT:-/home/msolitro/x-reg}"
XREG_DOCKERFILE="${XREG_DOCKERFILE:-$XREG_PROJECT_ROOT/Dockerfile}"
TARBALL="${TARBALL:-xreg-image.tar.gz}"
IMAGE_TAG="$TF_VAR_app_image"

echo "=== X-REG deployment ==="
echo "  Build context: $XREG_PROJECT_ROOT"
echo "  Image tag:     $IMAGE_TAG"
echo "  Tarball:       $TARBALL"
echo ""

if [ ! -f "$XREG_DOCKERFILE" ]; then
  echo "ERROR: Dockerfile not found at $XREG_DOCKERFILE"
  echo "       Set XREG_PROJECT_ROOT (and optionally XREG_DOCKERFILE) in .env."
  exit 1
fi

echo "[1/5] Building Docker image..."
cd "$REPO_ROOT"
docker build -t "$IMAGE_TAG" -f "$XREG_DOCKERFILE" "$XREG_PROJECT_ROOT"

echo "[1/5] Saving image to $TARBALL"
docker save "$IMAGE_TAG" | gzip > "$TARBALL"
echo "      Size: $(du -sh "$TARBALL" | cut -f1)"

# ─── Terraform ───────────────────────────────────────────────────────────────
echo "[2/5] terraform init..."
cd "$REPO_ROOT/terraform"
terraform init -upgrade -input=false

echo "[3/5] terraform plan..."
terraform plan -input=false

read -rp "Apply the plan? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Apply cancelled."
  exit 0
fi

echo "[4/5] terraform apply..."
terraform apply -input=false -auto-approve

VM_IP="$(terraform output -raw vm_external_ip)"
APP_DIR="$(terraform output -raw app_deploy_dir)"
echo "      VM IP: $VM_IP"
echo "      App dir on VM: $APP_DIR"

# ─── Push image and start stack ────────────────────────────────────────────
echo "[5/5] Waiting for SSH..."
TARBALL_PATH="$REPO_ROOT/$TARBALL"
for i in $(seq 1 30); do
  if ssh -i "$SSH_KEY" \
         -o StrictHostKeyChecking=no \
         -o ConnectTimeout=5 \
         -o BatchMode=yes \
         "$SSH_USER@$VM_IP" "echo ok" 2>/dev/null; then
    echo "      SSH ready."
    break
  fi
  echo "      Attempt $i/30 — retrying in 10 s..."
  sleep 10
done

echo "[5/5] Waiting for VM startup script (Docker install, compose files)..."
for i in $(seq 1 60); do
  if ssh -i "$SSH_KEY" \
         -o StrictHostKeyChecking=no \
         -o ConnectTimeout=5 \
         -o BatchMode=yes \
         "$SSH_USER@$VM_IP" \
         "test -f /var/lib/xreg-startup-complete" 2>/dev/null; then
    echo "      Startup script complete."
    break
  fi
  echo "      Attempt $i/60 — retrying in 10 s..."
  sleep 10
done

echo "[5/5] Uploading image tarball..."
scp -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    "$TARBALL_PATH" \
    "$SSH_USER@$VM_IP:$APP_DIR/"

echo "[5/5] docker load && compose up..."
# shellcheck disable=SC2029
ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    "$SSH_USER@$VM_IP" \
    "docker load -i \"$APP_DIR/$TARBALL\" && rm -f \"$APP_DIR/$TARBALL\" && cd \"$APP_DIR\" && docker compose up -d && docker compose ps"

echo ""
echo "=== Deployment complete ==="
terraform output
echo ""
echo "Application URL: $(terraform output -raw application_url)"
echo "(Accept the self-signed certificate warning on first visit if not using a real domain)"
