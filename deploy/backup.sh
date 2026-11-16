#!/bin/sh
# Versioned backup for UPPM: MySQL dump (all records, final documents, attachments)
# plus a .meta file recording which app image was running. Restore with restore.sh.
#
# Usage: backup.sh [label]        label e.g. daily, pre-deploy, manual (default: manual)
# Keeps backups for KEEP_DAYS days (default 30).
#
# Install on the VPS (once):
#   sudo install -m 700 backup.sh /opt/uppm/backup.sh
#   sudo install -m 700 restore.sh /opt/uppm/restore.sh
#   echo "30 2 * * * root /opt/uppm/backup.sh daily >> /var/log/uppm-backup.log 2>&1" | sudo tee /etc/cron.d/uppm-backup
set -e
APP_DIR="${APP_DIR:-/opt/uppm}"
KEEP_DAYS="${KEEP_DAYS:-30}"
label=$(printf '%s' "${1:-manual}" | tr -cd 'A-Za-z0-9_-')
cd "$APP_DIR"
mkdir -p backups
chmod 700 backups

name="uppm-$(date +%F-%H%M%S)-${label}"
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --add-drop-table uppm 2>/dev/null' \
  | gzip > "backups/$name.sql.gz.tmp"

# A dump without INSERTs or table definitions means something went wrong: do not keep it.
if ! zcat "backups/$name.sql.gz.tmp" | grep -q 'CREATE TABLE'; then
  rm -f "backups/$name.sql.gz.tmp"
  echo "$(date -Is) backup FAILED: empty dump" >&2
  exit 1
fi
mv "backups/$name.sql.gz.tmp" "backups/$name.sql.gz"

app_id=$(docker compose ps -q app 2>/dev/null || true)
image=""
[ -n "$app_id" ] && image=$(docker inspect -f '{{.Config.Image}}' "$app_id" 2>/dev/null || true)
revision=$(docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N uppm -e "SELECT revision FROM app_state WHERE id = 1" 2>/dev/null' || true)
cat > "backups/$name.meta" <<EOF
created=$(date -Is)
label=$label
app_image=$image
db_revision=$revision
EOF
chmod 600 "backups/$name.sql.gz" "backups/$name.meta"

find backups -name 'uppm-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find backups -name 'uppm-*.meta' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup OK: backups/$name.sql.gz (image: ${image:-unknown}, revision: ${revision:-?})"
