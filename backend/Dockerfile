FROM node:22-alpine AS development

RUN apk upgrade --no-cache

WORKDIR /app

ENV NODE_ENV=development

EXPOSE 3001

CMD ["sh", "-c", "echo 'Backend container ready.' && tail -f /dev/null"]
