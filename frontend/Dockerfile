FROM node:22-alpine AS development

RUN apk upgrade --no-cache

WORKDIR /app

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["sh", "-c", "echo 'Frontend container ready.' && tail -f /dev/null"]
