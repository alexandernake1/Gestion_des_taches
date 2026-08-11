# Exploitation de préproduction

## Services Docker

La plateforme est composée de PostgreSQL, Redis, l'API Django, le frontend Nginx, un worker Celery et Celery Beat. Vérifier leur état :

```bash
cd /home/ubuntu/Gestion_des_taches
sudo docker compose ps
curl -fsS http://127.0.0.1/api/health/
```

Le worker exécute les tâches asynchrones. Beat planifie chaque heure le suivi des abonnements et les notifications intelligentes.

## Sauvegardes

Le timer `gestion-des-taches-backup.timer` réalise une sauvegarde quotidienne, entre 03:30 et 03:45 UTC. Les fichiers sont conservés 14 jours dans :

```text
/home/ubuntu/backups/Gestion_des_taches
```

Contrôler le timer ou lancer une sauvegarde immédiate :

```bash
sudo systemctl status gestion-des-taches-backup.timer
sudo systemctl start gestion-des-taches-backup.service
sudo journalctl -u gestion-des-taches-backup.service -n 50 --no-pager
```

Restaurer une base doit être fait pendant une fenêtre de maintenance. Vérifier d'abord le nom exact de l'archive, puis restaurer :

```bash
cd /home/ubuntu/Gestion_des_taches
gzip -dc /home/ubuntu/backups/Gestion_des_taches/database-YYYYMMDDTHHMMSSZ.sql.gz \
  | sudo docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Les sauvegardes restent sur le VPS. Prévoir une copie chiffrée hors site avant toute mise en production publique.
