#!/usr/bin/env bash
# One-time VPS setup (Ubuntu/Debian). Run as a sudo-capable user:
#   curl -fsSL https://raw.githubusercontent.com/masbukhin/uppm-website/main/deploy/setup-vps.sh | bash
# or copy this file to the VPS and run: bash setup-vps.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/uppm}"
REPO_RAW="${REPO_RAW:-https://raw.githubusercontent.com/masbukhin/uppm-website/main}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker Engine + Compose plugin..."
  curl -fsSL https://get.docker.com | sudo sh
fi

sudo usermod -aG docker "$USER"
sudo mkdir -p "$APP_DIR"
sudo chown "$USER":"$USER" "$APP_DIR"
cd "$APP_DIR"

curl -fsSL "$REPO_RAW/docker-compose.yml" -o docker-compose.yml
if [ ! -f .env ]; then
  curl -fsSL "$REPO_RAW/.env.docker.example" -o .env
  # Generate strong random DB passwords.
  root_pw=$(openssl rand -hex 24)
  app_pw=$(openssl rand -hex 24)
  sed -i "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=$root_pw/" .env
  sed -i "s/^MYSQL_PASSWORD=.*/MYSQL_PASSWORD=$app_pw/" .env
  sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$(openssl rand -hex 32)/" .env
  chmod 600 .env
  echo "Created $APP_DIR/.env with random DB passwords. Edit APP_ORIGIN / APP_PORT / TURNSTILE_SECRET_KEY as needed."
fi

echo
echo "Done. Next steps:"
echo "  1. Log out and back in (so the docker group applies)."
echo "  2. Edit $APP_DIR/.env"
echo "  3. Add GitHub secrets VPS_HOST, VPS_USER, VPS_SSH_KEY, then push to main."
