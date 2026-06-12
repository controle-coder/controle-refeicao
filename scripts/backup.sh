#!/usr/bin/env bash
# ─── Backup do banco PostgreSQL (Neon) via pg_dump ────────────────────────────
#
# Uso:
#   ./scripts/backup.sh                    # usa DATABASE_URL do .env
#   DATABASE_URL="postgres://..." ./scripts/backup.sh
#
# Requisitos:
#   - pg_dump instalado (vem com postgresql-client)
#   - Variável DATABASE_URL definida (no .env ou no ambiente)
#
# O dump é salvo em ./backups/ com timestamp no nome.
# Para restaurar:  psql "$DATABASE_URL" < backups/backup_2026-06-12_14-30-00.sql

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Carrega .env se DATABASE_URL não estiver definida
if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_DIR/.env" ]; then
  export DATABASE_URL
  DATABASE_URL=$(grep '^DATABASE_URL=' "$PROJECT_DIR/.env" | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL nao definida. Defina no .env ou como variavel de ambiente."
  exit 1
fi

# Verifica se pg_dump esta disponivel
if ! command -v pg_dump &>/dev/null; then
  echo "ERRO: pg_dump nao encontrado. Instale o postgresql-client."
  echo "  Ubuntu/Debian: sudo apt install postgresql-client"
  echo "  macOS:         brew install libpq"
  echo "  Windows:       instale o PostgreSQL e adicione bin/ ao PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="backup_${TIMESTAMP}.sql"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "Iniciando backup..."
echo "  Destino: $FILEPATH"

pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  > "$FILEPATH"

FILESIZE=$(wc -c < "$FILEPATH" | tr -d ' ')
echo "Backup concluido com sucesso!"
echo "  Arquivo: $FILEPATH"
echo "  Tamanho: ${FILESIZE} bytes"

# Limpa backups com mais de 30 dias
DELETED=0
find "$BACKUP_DIR" -name "backup_*.sql" -type f -mtime +30 -print -delete 2>/dev/null | while read -r f; do
  DELETED=$((DELETED + 1))
done
if [ "$DELETED" -gt 0 ]; then
  echo "  Removidos $DELETED backups com mais de 30 dias."
fi

echo "Pronto."
