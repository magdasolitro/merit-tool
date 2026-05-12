project_id = "merit-496108"
region     = "europe-west8"
zone       = "europe-west8-b"

# ─── IP Allowlist ────────────────────────────────────────────────────────────
# Port 443 (HTTPS): only these IPs can reach the application.
# Port 80 is completely closed.
# Collect all participant IPs beforehand. /32 for a single host, /24 for a range.
allowed_cidr_blocks = [
  "217.77.80.0/20", # Venue / institution network
  # Add one entry per participant IP or shared network range
]

# Port 22 (SSH): admin access only — YOUR IP only, never participant IPs.
admin_cidr_blocks = [
  "217.77.82.234/32" # TODO cambiare IP 
]

# ─── VM Sizing ───────────────────────────────────────────────────────────────
machine_type = "n2-standard-8" # 8 vCPU, 32 GB RAM — sufficient for ~60 concurrent users
disk_size_gb = 60

# ─── Domain (optional) ──────────────────────────────────────────────────────
# Leave empty to use Caddy's self-signed TLS on the raw IP.
# Set to your domain (e.g. "xreg.example.com") for automatic Let's Encrypt TLS.
# If set, ensure your DNS A record points to the output vm_external_ip BEFORE apply.
domain_name = ""

# ─── Secrets / SSH (read from .env by setup/update/destroy) ─────────────────
# ssh_username, ssh_public_key_path, app_image, app_internal_port, app_deploy_dir
# are passed as TF_VAR_* from .env. Edit .env — not this file for those.

