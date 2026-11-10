#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
sqlite3 data/app.db ".backup 'backups/app-$stamp.db'"
if [ -d data/uploads ]; then
  tar -czf "backups/uploads-$stamp.tgz" -C data uploads
fi
# 保留最近 14 份
ls -1t backups/* 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "backup done: backups/app-$stamp.db"
