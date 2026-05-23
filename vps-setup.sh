#!/usr/bin/env bash
# ============================================================
# NovelCodex — VPS Setup Script
# Run as root on the VPS after cloning the webapp repo.
# Usage: bash vps-setup.sh
#
# IMPORTANT: Before running, create .env.local with your keys:
#   cp .env.example .env.local
#   nano .env.local
# ============================================================
set -euo pipefail

WEBAPP_DIR="/root/cultivation-scraper/webapp"
REPO_URL="${1:-}"

# ── 1. Node.js 20 LTS ────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo ">>> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node --version)  npm: $(npm --version)"

# ── 2. PM2 ───────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo ">>> Installing PM2..."
  npm install -g pm2
fi

# ── 3. Clone / update webapp ──────────────────────────────────
if [ -n "$REPO_URL" ]; then
  if [ -d "$WEBAPP_DIR/.git" ]; then
    echo ">>> Pulling latest webapp..."
    git -C "$WEBAPP_DIR" pull
  else
    echo ">>> Cloning webapp..."
    git clone "$REPO_URL" "$WEBAPP_DIR"
  fi
fi

# ── 4. .env.local ─────────────────────────────────────────────
ENV_FILE="$WEBAPP_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$WEBAPP_DIR/.env.example" ]; then
    cp "$WEBAPP_DIR/.env.example" "$ENV_FILE"
    echo ">>> Copied .env.example → .env.local"
    echo ">>> IMPORTANT: Edit .env.local and add your real API keys before continuing."
    echo ">>> Run: nano $ENV_FILE"
    exit 1
  else
    echo "ERROR: .env.local not found and no .env.example to copy."
    echo "Create $ENV_FILE with your environment variables and re-run."
    exit 1
  fi
fi

# ── 5. Install deps & build ───────────────────────────────────
cd "$WEBAPP_DIR"
echo ">>> Installing npm dependencies..."
npm ci --prefer-offline

echo ">>> Building Next.js (this takes ~30-60 seconds)..."
npm run build

# ── 6. Start / restart with PM2 ──────────────────────────────
echo ">>> Starting with PM2..."
pm2 delete cultivationai 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# ── 7. Update Nginx: port 80 → Next.js (3000) ────────────────
echo ">>> Updating Nginx config..."
cat > /etc/nginx/sites-available/api-proxy <<'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Security headers
    add_header X-Content-Type-Options  nosniff always;
    add_header X-Frame-Options         DENY    always;
    add_header Referrer-Policy         strict-origin-when-cross-origin always;

    # Rate limit: 20 req/s per IP, burst 50
    limit_req_zone $binary_remote_addr zone=general:10m rate=20r/s;
    limit_req zone=general burst=50 nodelay;

    # Next.js webapp
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        client_max_body_size 10k;
    }
}
NGINXEOF

nginx -t && systemctl reload nginx

echo ""
echo "============================================================"
echo " NovelCodex is live at http://$(curl -s ifconfig.me)/"
echo " PM2 status: pm2 status"
echo " Logs:       pm2 logs cultivationai"
echo "============================================================"
