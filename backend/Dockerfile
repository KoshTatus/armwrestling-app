FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей (для psycopg2-binary не требуется gcc/libpq-dev, но оставим для других пакетов)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements.txt
COPY requirements.txt .

# Устанавливаем зависимости через pip (без uv)
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

# Скрипт ожидания БД и миграций
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]