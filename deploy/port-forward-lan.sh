#!/usr/bin/env bash
# Chuáº©n bá»‹ server LAN cho port-forward ra internet.
# Cháº¡y trÃªn server: sudo bash port-forward-lan.sh [PUBLIC_IP]
set -euo pipefail

PUBLIC_IP="${1:-}"
if [[ -z "$PUBLIC_IP" ]]; then
  PUBLIC_IP="$(curl -s --max-time 8 ifconfig.me || true)"
fi
if [[ -z "$PUBLIC_IP" ]]; then
  echo "KhÃ´ng láº¥y Ä‘Æ°á»£c public IP. Truyá»n tay: sudo bash port-forward-lan.sh 1.2.3.4"
  exit 1
fi

PUBLIC_URL="http://${PUBLIC_IP}:8080"
ENV_FILE="/opt/genposter/.env"

echo "Public IP : $PUBLIC_IP"
echo "Public URL: $PUBLIC_URL"

# Cáº­p nháº­t NC_PUBLIC_URL (giá»¯ nguyÃªn PG_PASSWORD).
if grep -q '^NC_PUBLIC_URL=' "$ENV_FILE"; then
  sed -i "s|^NC_PUBLIC_URL=.*|NC_PUBLIC_URL=$PUBLIC_URL|" "$ENV_FILE"
else
  echo "NC_PUBLIC_URL=$PUBLIC_URL" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"

# Firewall: chá»‰ má»Ÿ port cáº§n thiáº¿t.
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1 || true
  ufw allow 8080/tcp comment 'NocoDB' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
  ufw status verbose
fi

cd /opt/genposter
docker compose up -d

echo ""
echo "Server Ä‘Ã£ cáº¥u hÃ¬nh NC_PUBLIC_URL=$PUBLIC_URL"
echo "Tiáº¿p theo: cáº¥u hÃ¬nh port-forward trÃªn router (xem deploy/PORT-FORWARD.md)"
echo "Test tá»« ngoÃ i máº¡ng: curl $PUBLIC_URL/api/v1/health"
