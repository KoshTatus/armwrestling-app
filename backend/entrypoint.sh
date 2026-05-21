#!/bin/sh
set -e

# Ожидание PostgreSQL (если нужен netcat)
if ! command -v nc >/dev/null 2>&1; then
    apt-get update && apt-get install -y netcat-openbsd
fi

echo "Waiting for PostgreSQL..."
while ! nc -z db 5432; do
  sleep 0.5
done
echo "PostgreSQL started"


# Запуск Uvicorn
uvicorn src.main:app --port 5000