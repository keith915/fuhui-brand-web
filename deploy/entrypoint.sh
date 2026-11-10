#!/bin/sh
set -eu
cd /app
mkdir -p data/uploads
if [ ! -f data/app.db ]; then
  echo "[entrypoint] 首次启动：导入站点初始内容并构建静态页"
  node scripts/seed-from-site.mjs
  node scripts/build-site.mjs
fi
exec node server/src/index.ts
