# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:admin

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 ca-certificates git \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server ./server
COPY site ./site
COPY scripts ./scripts
COPY index.html app.js styles.css ./
COPY admin/dist ./admin/dist
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN chmod +x ./deploy/entrypoint.sh
EXPOSE 8787
ENTRYPOINT ["./deploy/entrypoint.sh"]
