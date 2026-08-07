# Runbook d'Exploitation & Incidents — StudyVault

Guide d'intervention d'urgence pour les administrateurs et l'équipe DevOps.

## 1. Procédure de Backup & Restauration PostgreSQL

### Sauvegarde à chaud (Backup) :
```bash
pg_dump -U studyvault -h localhost studyvault_db | gzip > backup_studyvault_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restauration d'urgence :
```bash
gunzip -c backup_studyvault_20260807.sql.gz | psql -U studyvault -h localhost studyvault_db
```

## 2. Invalidation de Masse des Sessions & Tokens

Si une clé de sécurité JWT est compromise :
1. Générer une nouvelle clé dans le fichier de secrets.
2. Redémarrer les conteneurs backend (`docker-compose restart backend`).

## 3. Purge RGPD des Comptes Utilisateurs (30 Jours)

Exécuter le script de purge planifié :
```bash
node dist/scripts/purge-deleted-accounts.js
```
