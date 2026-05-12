# X-REG — Terraform / GCP deployment

This folder provisions a **GCP VM** that runs the **x-reg** Docker image behind **Caddy** (HTTPS on 443). There is no PostgreSQL or Gemini in this path: only your app container plus the reverse proxy.

---

## Prerequisites

1. [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.6  
2. [gcloud CLI](https://cloud.google.com/sdk/docs/install)  
3. Docker (to build the image on your laptop before `terraform apply` completes the SCP step)

---

## Files

| File | Description |
|---|---|
| `main.tf` | Terraform provider config, required GCP APIs |
| `variables.tf` | Input variables (SSH, app image/port/paths, optional domain) |
| `compute.tf` | VM instance, static IP, startup script |
| `network.tf` | VPC, subnet, firewall rules (HTTPS + SSH allowlists) |
| `outputs.tf` | VM IP, SSH command, HTTPS URL, `app_deploy_dir` |
| `terraform.tfvars.example` | Example values — copy to `terraform.tfvars` and edit |
| `startup.sh.tpl` | First-boot script on the VM: Docker, `docker-compose.yml`, Caddyfile, TLS |
| `setup.sh` | **Full deploy** — build x-reg image, Terraform, SCP tarball, `docker compose up` |
| `update.sh` | **Infra-only** — `terraform apply` without rebuilding the image |
| `destroy.sh` | **Teardown** — destroys all Terraform-managed GCP resources |

---

## Configuration

### 1. `.env` (repository root)

Copy `.env.example` to `.env` and set at least `SSH_USER`, `SSH_KEY`, and `XREG_PROJECT_ROOT` (path to your x-reg clone with a `Dockerfile`).

Optional overrides:

| Variable | Purpose |
|---|---|
| `APP_IMAGE` | Image tag (default `xreg:latest`) — must match `docker build -t` |
| `APP_INTERNAL_PORT` | Port the app listens on in the container (default `3000`) — set to match x-reg’s `EXPOSE` / server port |
| `APP_DEPLOY_DIR` | Directory on the VM (default `/home/xreg-app`) — if you change it, keep Terraform in sync via `TF_VAR` (same name in `.env`) |
| `TARBALL` | Local gzip tarball name during deploy (default `xreg-image.tar.gz`) |

### 2. `terraform.tfvars`

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit `project_id`, `allowed_cidr_blocks`, `admin_cidr_blocks`, optional `domain_name`, VM size, etc.

SSH and app image settings are **not** duplicated here: scripts pass them from `.env` as `TF_VAR_*`.

---

## Usage

Run scripts from the **repository root**.

### Deploy (first time or new image)

```bash
bash terraform/setup.sh
```

Steps:

1. Load `.env`
2. GCP Application Default Credentials (`gcloud auth application-default login` if needed)
3. `docker build` in `XREG_PROJECT_ROOT`, tag `APP_IMAGE` (default `xreg:latest`)
4. `docker save | gzip` → tarball in repo root
5. `terraform init` / `plan` / `apply` (you confirm the plan)
6. Wait for SSH and for `/var/lib/xreg-startup-complete` on the VM
7. `scp` tarball to `app_deploy_dir` on the VM
8. On the VM: `docker load`, `docker compose up -d`

The app is served over HTTPS on the VM’s static IP (self-signed TLS) unless you set `domain_name` and point DNS at that IP for Let’s Encrypt.

### Update infrastructure only

When you changed `.tf` / `.tfvars` but **not** the Docker image:

```bash
bash terraform/update.sh
```

### Destroy

```bash
bash terraform/destroy.sh
```

This deletes the VM, firewall rules, and VPC. All data on the VM is lost.

---

## Outputs

| Output | Example |
|---|---|
| `vm_external_ip` | `34.79.101.126` |
| `vm_name` | `xreg-vm` |
| `app_deploy_dir` | `/home/xreg-app` |
| `application_url` | `https://34.79.101.126` |
| `ssh_command` | `ssh -i ~/.ssh/key user@34.79.101.126` |

---

## Security

- **Port 443** — only `allowed_cidr_blocks` (participants).
- **Port 22** — only `admin_cidr_blocks` (plus IAP range for `gcloud compute ssh --tunnel-through-iap`).
- The app is bound to `127.0.0.1:<port>` on the VM; users reach it only via Caddy on 443.

---
