#!/usr/bin/env bash
set -Eeuo pipefail

workspace_dir="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
backup_dir="${1:-${BACKUP_DIR:-$workspace_dir/backups}}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"

if ! [[ "$retention_days" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS doit être un entier positif ou nul." >&2
  exit 2
fi

mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"
chmod 700 "$backup_dir"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$backup_dir/postgres-$timestamp.dump"
checksum_file="$backup_file.sha256"
partial_file="$backup_file.partial"

cleanup() {
  rm -f -- "$partial_file"
}
trap cleanup EXIT

cd "$workspace_dir"
docker compose exec -T postgres sh -c \
  'pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$partial_file"

if [[ ! -s "$partial_file" ]]; then
  echo "La sauvegarde PostgreSQL est vide." >&2
  exit 1
fi

mv "$partial_file" "$backup_file"
trap - EXIT
sha256sum "$backup_file" > "$checksum_file"
chmod 600 "$backup_file" "$checksum_file"

find "$backup_dir" -maxdepth 1 -type f \
  \( -name 'postgres-*.dump' -o -name 'postgres-*.dump.sha256' \) \
  -mtime +"$retention_days" -print -delete

echo "$backup_file"
