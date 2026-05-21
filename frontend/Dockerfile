# Этап сборки
FROM node:20-alpine AS build

WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка production-версии
RUN npm run build

# Этап сервера (nginx)
FROM nginx:alpine

# Копирование собранных файлов из предыдущего этапа
COPY --from=build /app/build /usr/share/nginx/html

# Копирование пользовательского конфига nginx (для обработки React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]