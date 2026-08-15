#!/bin/sh
set -eu

echo "[entrypoint] Applying database migrations..."
node ./scripts/run-migrations.js

echo "[entrypoint] Starting application..."
exec node server.js
