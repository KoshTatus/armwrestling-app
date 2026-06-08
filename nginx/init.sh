#!/bin/sh
set -e

SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"

# Генерируем сертификаты, если их нет
if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
    echo "🔐 Сертификаты не найдены. Генерируем новые..."
    apk add --no-cache mkcert
    cd "$SSL_DIR"
    mkcert -install
    mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 ::1
    cd /
else
    echo "✅ Сертификаты найдены."
fi

# Запускаем Nginx
exec "$@"