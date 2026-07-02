#!/usr/bin/env bash
# One-shot provisioning for the LAN server (run with sudo).
# Usage: sudo bash provision-lan.sh <PG_PASSWORD> <PUBLIC_URL>
set -euo pipefail

PG_PASSWORD="$1"
PUBLIC_URL="$2"

mkdir -p /opt/genposter
mv -f /tmp/docker-compose.yml /tmp/backup.sh /opt/genposter/
sed -i 's/\r$//' /opt/genposter/docker-compose.yml /opt/genposter/backup.sh
chmod +x /opt/genposter/backup.sh

cat > /opt/genposter/.env <<EOF
PG_PASSWORD=$PG_PASSWORD
NC_INVITE_ONLY_SIGNUP=false
NC_PUBLIC_URL=$PUBLIC_URL
EOF
chmod 600 /opt/genposter/.env

cd /opt/genposter
docker compose up -d

# Nightly backup at 02:00.
printf '0 2 * * * root /opt/genposter/backup.sh >> /var/log/genposter-backup.log 2>&1\n' \
  > /etc/cron.d/genposter-backup
chmod 644 /etc/cron.d/genposter-backup

echo PROVISIONED
