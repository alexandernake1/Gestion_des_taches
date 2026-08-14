#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || "$1" != "--confirm-restore" ]]; then
  echo "Usage: $0 --confirm-restore /chemin/vers/postgres-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 2
fi

workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_file="$(realpath "$2")"

if [[ ! -f "$backup_file" || ! -s "$backup_file" ]]; then
  echo "Le fichier de sauvegarde est absent ou vide: $backup_file" >&2
  exit 1
fi

cd "$workspace_dir"
docker compose exec -T postgres pg_restore --list < "$backup_file" > /dev/null

safety_dir="$workspace_dir/backups/pre-restore"
"$workspace_dir/ops/backup-postgres.sh" "$safety_dir" > /dev/null

restart_services() {
  docker compose up -d backend celery_worker celery_beat frontend > /dev/null
}
trap restart_services EXIT

docker compose stop frontend celery_worker celery_beat backend > /dev/null
docker compose exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$backup_file"

echo "Restauration PostgreSQL terminée. Une sauvegarde de sécurité a été créée dans $safety_dir."
