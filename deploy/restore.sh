#!/bin/sh
# Restore UPPM to an earlier backup version.
#
#   restore.sh list                          show available versions (newest first)
#   restore.sh <backup> [--with-app] [--yes]
#       <backup>     file name from `list` (with or without .sql.gz), or "latest"
#       --with-app   also roll the app back to the image that was running at backup time
#       --yes        skip the confirmation prompt
#
# Before restoring, the current state is saved as a "pre-restore" backup,
# so a restore can itself be undone by restoring that backup.
set -e
APP_DIR="${APP_DIR:-/opt/uppm}"
cd "$APP_DIR"

if [ "${1:-list}" = list ]; then
  printf '%-45s %-12s %-9s %s\n' BACKUP LABEL REVISION APP_IMAGE
  for f in $(ls -t backups/uppm-*.sql.gz 2>/dev/null); do
    base=$(basename "$f" .sql.gz)
    meta="backups/$base.meta"
    label=$(grep '^label=' "$meta" 2>/dev/null | cut -d= -f2-)
    rev=$(grep '^db_revision=' "$meta" 2>/dev/null | cut -d= -f2-)
    img=$(grep '^app_image=' "$meta" 2>/dev/null | cut -d= -f2- | sed 's/.*://' | cut -c1-12)
    printf '%-45s %-12s %-9s %s\n' "$base" "${label:--}" "${rev:--}" "${img:--}"
  done
  exit 0
fi

target="$1"; shift
with_app=no; assume_yes=no
for arg in "$@"; do
  case "$arg" in
    --with-app) with_app=yes ;;
    --yes) assume_yes=yes ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [ "$target" = latest ]; then
  file=$(ls -t backups/uppm-*.sql.gz 2>/dev/null | grep -v pre-restore | head -1)
else
  base=$(basename "$target" .sql.gz)
  file="backups/$base.sql.gz"
fi
[ -f "$file" ] || { echo "Backup not found: $file (run: restore.sh list)" >&2; exit 1; }
meta="${file%.sql.gz}.meta"
image=$(grep '^app_image=' "$meta" 2>/dev/null | cut -d= -f2-)

echo "Restore database from: $file"
[ "$with_app" = yes ] && echo "Roll app back to image:  ${image:-unknown}"
echo "Current data will first be saved as a 'pre-restore' backup."
if [ "$assume_yes" != yes ]; then
  printf 'Type YES to continue: '
  read answer
  [ "$answer" = YES ] || { echo "Cancelled."; exit 1; }
fi

"$APP_DIR/backup.sh" pre-restore

echo "Restoring database..."
zcat "$file" | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" uppm 2>/dev/null'

if [ "$with_app" = yes ]; then
  [ -n "$image" ] || { echo "No app image recorded in $meta; database restored, app unchanged." >&2; exit 1; }
  echo "Switching app to $image ..."
  APP_IMAGE="$image" docker compose up -d app
  # Remember the pinned image so a plain `docker compose up -d` keeps it.
  if grep -q '^APP_IMAGE=' .env; then
    sed -i "s#^APP_IMAGE=.*#APP_IMAGE=$image#" .env
  else
    echo "APP_IMAGE=$image" >> .env
  fi
else
  docker compose restart app
fi

echo "Restore done. Check: docker compose ps && curl -s http://127.0.0.1:\${APP_PORT:-80}/api/health"
