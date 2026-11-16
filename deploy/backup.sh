#!/bin/sh
# Daily MySQL backup for UPPM (all records, including final documents and attachments
# stored in the payload JSON). Keeps the last 14 days in /opt/uppm/backups.
#
# Install on the VPS (once):
#   sudo cp backup.sh /opt/uppm/backup.sh && sudo chmod 700 /opt/uppm/backup.sh
#   echo "30 2 * * * root /opt/uppm/backup.sh >> /var/log/uppm-backup.log 2>&1" | sudo tee /etc/cron.d/uppm-backup
set -e
APP_DIR="${APP_DIR:-/opt/uppm}"
cd "$APP_DIR"
mkdir -p backups
file="backups/uppm-$(date +%F-%H%M).sql.gz"
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines uppm 2>/dev/null' | gzip > "$file"
chmod 600 "$file"
find backups -name 'uppm-*.sql.gz' -mtime +14 -delete
echo "$(date -Is) backup OK: $file"
