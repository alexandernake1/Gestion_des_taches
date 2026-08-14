#!/usr/bin/env bash
set -euo pipefail

workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="${1:-$workspace_dir/backups}"
mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$backup_dir/postgres-$timestamp.dump"
checksum_file="$backup_file.sha256"
partial_file="$backup_file.partial"

cleanup_partial() {
  rm -f "$partial_file"
}
trap cleanup_partial EXIT

cd "$workspace_dir"
docker compose exec -T postgres sh -c 'pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$partial_file"

if [[ ! -s "$partial_file" ]]; then
  echo "La sauvegarde PostgreSQL est vide." >&2
  exit 1
fi

mv "$partial_file" "$backup_file"
trap - EXIT
sha256sum "$backup_file" > "$checksum_file"
chmod 600 "$backup_file" "$checksum_file"

echo "$backup_file"
