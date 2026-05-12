#!/bin/bash
set -euo pipefail

# ─── Logging ─────────────────────────────────────────────────────────────────
exec > >(tee /var/log/xreg-startup.log) 2>&1
echo "=== X-REG startup script BEGIN $(date -u) ==="

# ─── System Hardening ────────────────────────────────────────────────────────
sysctl -w net.ipv4.ip_forward=0 || true
sysctl -w net.ipv4.conf.all.accept_redirects=0 || true
sysctl -w net.ipv4.conf.default.accept_redirects=0 || true
sysctl -w net.ipv4.tcp_syncookies=1 || true

# ─── Install Docker (official script — works on Debian 12) ──────────────────
echo "Installing Docker..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ${ssh_username}
echo "Docker $(docker --version) installed."
echo "Docker Compose $(docker compose version) installed."

# ─── Application directory on the VM ───────────────────────────────────────
APP_DIR="${app_deploy_dir}"
mkdir -p "$APP_DIR"
chown ${ssh_username}:${ssh_username} "$APP_DIR"
cd "$APP_DIR"

# ─── docker-compose (app + Caddy only; image loaded later via setup.sh) ─────
cat > docker-compose.yml << COMPOSEEOF
services:

  app:
    image: ${app_image}
    container_name: xreg-app
    restart: unless-stopped
    ports:
      - "127.0.0.1:${app_internal_port}:${app_internal_port}"
    networks:
      - xreg-internal

  caddy:
    image: caddy:2-alpine
    container_name: xreg-caddy
    restart: unless-stopped
    ports:
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./tls.crt:/etc/caddy/tls.crt:ro
      - ./tls.key:/etc/caddy/tls.key:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - app
    networks:
      - xreg-internal

networks:
  xreg-internal:
    driver: bridge

volumes:
  caddy-data:
    driver: local
  caddy-config:
    driver: local
COMPOSEEOF

chown ${ssh_username}:${ssh_username} docker-compose.yml

# ─── Write Caddyfile ─────────────────────────────────────────────────────────
VM_IP=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" \
  || echo "localhost")
echo "VM external IP: $VM_IP"

apt-get install -y -qq openssl
openssl req -x509 -newkey rsa:4096 \
  -keyout "$APP_DIR/tls.key" \
  -out "$APP_DIR/tls.crt" \
  -days 365 -nodes \
  -subj "/CN=xreg-demo" \
  -addext "subjectAltName=IP:$VM_IP,IP:127.0.0.1"
chown ${ssh_username}:${ssh_username} "$APP_DIR/tls.key" "$APP_DIR/tls.crt"
chmod 600 "$APP_DIR/tls.key"
echo "Self-signed TLS certificate generated for IP: $VM_IP"

DOMAIN="${domain_name}"

if [ -n "$DOMAIN" ]; then
  cat > Caddyfile << CADDYEOF
$$DOMAIN {
    reverse_proxy app:${app_internal_port}

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    log {
        output file /data/access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
CADDYEOF
else
  cat > Caddyfile << CADDYEOF
:443 {
    tls /etc/caddy/tls.crt /etc/caddy/tls.key

    reverse_proxy app:${app_internal_port}

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    log {
        output file /data/access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
CADDYEOF
fi

chown ${ssh_username}:${ssh_username} Caddyfile

echo "NOTE: Config files written. Waiting for setup.sh to load ${app_image} and start containers."

touch /var/lib/xreg-startup-complete

echo "=== X-REG startup script END $(date -u) ==="
