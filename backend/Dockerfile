FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ make python3-dev libpq-dev ca-certificates netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

# Ожидание PostgreSQL и запуск
CMD sh -c 'while ! nc -z db 5432; do sleep 0.5; done; \
           uv run main.py'

EXPOSE 5000