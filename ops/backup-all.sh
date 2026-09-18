#!/usr/bin/env bash
set -Eeuo pipefail

workspace_dir="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
backup_root="${1:-${BACKUP_DIR:-$workspace_dir/backups}}"

mkdir -p "$backup_root"
backup_root="$(cd "$backup_root" && pwd)"
chmod 700 "$backup_root"

postgres_backup="$("$workspace_dir/ops/backup-postgres.sh" "$backup_root/postgres")"
media_backup="$("$workspace_dir/ops/backup-media.sh" "$backup_root/media")"

printf 'PostgreSQL: %s\nMédias: %s\n' "$postgres_backup" "$media_backup"
