#!/usr/bin/env bash
# Point NocoDB invite/verify links to the LAN URL (not cloud, not wrong public IP).
set -euo pipefail

LAN_URL="${1:-http://192.168.110.101:8080}"
ENV_FILE="/opt/genposter/.env"

echo "Setting NC_PUBLIC_URL=$LAN_URL"

if grep -q '^NC_PUBLIC_URL=' "$ENV_FILE"; then
  sed -i "s|^NC_PUBLIC_URL=.*|NC_PUBLIC_URL=$LAN_URL|" "$ENV_FILE"
else
  echo "NC_PUBLIC_URL=$LAN_URL" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"

cd /opt/genposter
docker compose up -d

echo "Done. Restarted NocoDB with NC_PUBLIC_URL=$LAN_URL"
echo "Invite links will use this URL only after SMTP is configured."
echo "Until then: share login URL + password manually (see deploy/set-user-password.mjs)."
