#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/Gestion_des_taches}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/Gestion_des_taches}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be a non-negative integer." >&2
  exit 2
fi

install -d -m 700 "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
database_backup="$BACKUP_DIR/database-$timestamp.sql.gz"
environment_backup="$BACKUP_DIR/env-$timestamp"
temporary_backup="$(mktemp "$BACKUP_DIR/.database-$timestamp.XXXXXX")"

cleanup() {
  rm -f "$temporary_backup"
}
trap cleanup EXIT

cd "$PROJECT_DIR"
sudo /usr/bin/docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$temporary_backup"

test -s "$temporary_backup"
chmod 600 "$temporary_backup"
mv "$temporary_backup" "$database_backup"
cp .env "$environment_backup"
chmod 600 "$environment_backup"

find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'database-*.sql.gz' -o -name 'env-*' \) \
  -mtime +"$RETENTION_DAYS" -print -delete

echo "Backup completed: $(basename "$database_backup")"
