FROM nginx:alpine

# Устанавливаем wget и скачиваем mkcert через официальный dinamic URL
RUN apk add --no-cache wget && \
    wget -O /usr/local/bin/mkcert "https://dl.filippo.io/mkcert/latest?for=linux/amd64" && \
    chmod +x /usr/local/bin/mkcert

# Удаляем стандартную конфигурацию
RUN rm /etc/nginx/conf.d/default.conf

# Копируем наши файлы конфигурации
COPY nginx.conf /etc/nginx/conf.d/
COPY init.sh /init.sh
RUN chmod +x /init.sh

ENTRYPOINT ["/init.sh"]
CMD ["nginx", "-g", "daemon off;"]