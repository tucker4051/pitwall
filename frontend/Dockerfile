FROM node:22-alpine AS base

RUN apk upgrade --no-cache

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS development

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["sh", "-c", "echo 'Frontend container ready.' && tail -f /dev/null"]

FROM base AS dependencies

COPY package*.json ./
RUN npm ci

FROM dependencies AS build

ARG NEXT_PUBLIC_APP_NAME=PitWall
ARG NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:3001/ws

ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_BACKEND_WS_URL=$NEXT_PUBLIC_BACKEND_WS_URL

COPY . .
RUN npm run build

FROM base AS production-dependencies

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS production

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package*.json ./
COPY next.config.ts ./

EXPOSE 3000

CMD ["npm", "run", "start"]
