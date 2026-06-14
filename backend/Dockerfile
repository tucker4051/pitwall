FROM node:22-alpine AS base

RUN apk upgrade --no-cache

WORKDIR /app

FROM base AS development

ENV NODE_ENV=development

EXPOSE 3001

CMD ["sh", "-c", "echo 'Backend container ready.' && tail -f /dev/null"]

FROM base AS dependencies

COPY package*.json ./
RUN npm ci

FROM dependencies AS build

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS production-dependencies

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS production

ENV NODE_ENV=production
ENV BACKEND_PORT=3001

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

EXPOSE 3001

CMD ["npm", "run", "start"]
