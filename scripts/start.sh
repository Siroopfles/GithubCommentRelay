#!/bin/sh
set -e
if [ "$ROLE" = "worker" ]; then
  npx prisma db push
  exec node dist/worker.js
else
  exec node server.js
fi
