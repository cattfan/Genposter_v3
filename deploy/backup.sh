#!/usr/bin/env bash
# Nightly backup, sized for a 40GB VPS holding ~10GB of photos:
#  - Postgres logical dump daily (small): keep 7 daily + 4 weekly.
#  - NocoDB data volume (attachments): incremental rsync mirror (only
#    changed files are copied; deletions propagate). One full copy on disk.
# Installed at /opt/genposter/backup.sh, run by cron at 02:00.
set -euo pipefail

BACKUP_DIR=/opt/backups
STAMP=$(date +%F)
DOW=$(date +%u) # 7 = Sunday

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/nc_data_mirror"

cd /opt/genposter

# 1. Postgres dump (custom format, restore with pg_restore).
docker compose exec -T postgres pg_dump -U genposter -d genposter -Fc \
  > "$BACKUP_DIR/daily/genposter_$STAMP.dump"

if [ "$DOW" = "7" ]; then
  cp "$BACKUP_DIR/daily/genposter_$STAMP.dump" "$BACKUP_DIR/weekly/"
fi

# 2. Attachment mirror (incremental, propagates deletes). Reads the volume
#    directly on the host so no container/network is involved.
NC_DATA=$(docker volume inspect genposter_nc_data -f '{{.Mountpoint}}')
rsync -a --delete "$NC_DATA/" "$BACKUP_DIR/nc_data_mirror/"

# Retention: 7 daily dumps, 4 weekly dumps. `|| true` because an empty dir
# makes ls exit non-zero, which would kill the script under pipefail.
(ls -1t "$BACKUP_DIR/daily"/genposter_*.dump 2>/dev/null || true) | tail -n +8 | xargs -r rm -f
(ls -1t "$BACKUP_DIR/weekly"/genposter_*.dump 2>/dev/null || true) | tail -n +5 | xargs -r rm -f

echo "backup ok $STAMP: db=$(du -h "$BACKUP_DIR/daily/genposter_$STAMP.dump" | cut -f1) mirror=$(du -sh "$BACKUP_DIR/nc_data_mirror" | cut -f1)"
