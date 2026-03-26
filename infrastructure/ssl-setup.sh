#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# SSL Setup Script – Let's Encrypt via Certbot
# Usage: bash ssl-setup.sh yourdomain.com your@email.com
# Must be run AFTER ec2-deploy.sh and AFTER DNS is pointing to this server.
# ──────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="${1:?Usage: bash ssl-setup.sh DOMAIN EMAIL}"
EMAIL="${2:?Usage: bash ssl-setup.sh DOMAIN EMAIL}"

echo "==> Installing Certbot..."
if command -v apt-get &>/dev/null; then
  sudo apt-get update -y
  sudo apt-get install -y certbot
else
  sudo yum install -y certbot
fi

echo "==> Stopping Nginx temporarily for standalone challenge..."
cd /opt/notes-app
docker compose stop nginx

echo "==> Obtaining SSL certificate for $DOMAIN..."
sudo certbot certonly \
  --standalone \
  --agree-tos \
  --no-eff-email \
  --email "$EMAIL" \
  -d "$DOMAIN"

echo "==> Writing SSL Nginx config..."
sudo tee /opt/notes-app/nginx/nginx-ssl.conf > /dev/null <<EOF
server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host \$host;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}
EOF

echo "==> Restarting Nginx with SSL..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

echo "==> Setting up auto-renewal cron job..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f /opt/notes-app/docker-compose.yml -f /opt/notes-app/docker-compose.prod.yml exec nginx nginx -s reload") | crontab -

echo ""
echo "==> SSL setup complete! Your app is now available at https://${DOMAIN}"
