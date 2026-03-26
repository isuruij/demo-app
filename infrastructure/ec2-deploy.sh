#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# EC2 Bootstrap & Deployment Script
# Run as: bash ec2-deploy.sh
# Tested on: Ubuntu 24.04 LTS (t2.micro) — us-east-1
# ──────────────────────────────────────────────────────────────────────────────
set -e

APP_DIR="/opt/notes-app"
REPO_URL="https://github.com/isuruij/demo-app.git"

echo "==> Updating system packages..."
if command -v yum &>/dev/null; then
  sudo yum update -y
  sudo yum install -y docker git
else
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg git
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

echo "==> Starting Docker..."
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"

echo "==> Installing Docker Compose plugin (if not present)..."
DOCKER_COMPOSE_VERSION="v2.24.5"
if ! docker compose version &>/dev/null; then
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -SL \
    "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

echo "==> Cloning / updating repository..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER":"$USER" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "==> Setting up environment file..."
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"

  # Auto-generate a secure SECRET_KEY using Python's built-in secrets module
  SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
  sed -i "s|your-very-long-random-django-secret-key-change-this|${SECRET_KEY}|" "$APP_DIR/.env"
  echo "  ✔ SECRET_KEY generated automatically."

  echo ""
  echo "  !! IMPORTANT: Edit $APP_DIR/.env with your real values:"
  echo "     - ALLOWED_HOSTS=<your EC2 public IP>"
  echo "     - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME"
  echo "     - DB_PASSWORD (change from default)"
  echo "     - CORS_ALLOWED_ORIGINS=http://<your EC2 public IP>"
  echo ""
  echo "  Run: nano $APP_DIR/.env"
  echo "  Press ENTER when done, or Ctrl+C to abort."
  read -r
fi

echo "==> Pulling and building containers..."
cd "$APP_DIR"
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

echo "==> Starting application..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "==> Deployment complete!"
echo "    Application running at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS A record to the EC2 public IP"
echo "  2. Run SSL setup:  bash infrastructure/ssl-setup.sh yourdomain.com"
