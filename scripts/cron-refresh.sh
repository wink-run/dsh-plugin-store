#!/usr/bin/env bash
# ============================================================================
# DSH Store · cron refresh script
#
# Pulls the latest plugin data from origin/main, then restarts the deployed
# service so the new data takes effect. With the Docker Compose deployment
# the data is baked into the image, so the service is rebuilt and recreated.
#
# crontab example (every 3 hours, log to file):
#   0 */3 * * * /opt/ds-plugin-store/scripts/cron-refresh.sh >> /var/log/dsh-store-refresh.log 2>&1
#
# First-time server setup:
#   git clone https://github.com/wink-run/dsh-plugin-store.git /opt/ds-plugin-store
#   cd /opt/ds-plugin-store
#   cp .env.example .env                # set DOMAIN
#   ./scripts/gen-certs.sh your.domain  # or install real certs into ./certs
#   docker compose up -d --build
# ============================================================================
set -euo pipefail

# cron runs with a minimal PATH; make common binaries visible
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin"

cd "$(dirname "$0")/.."

echo "[$(date '+%F %T')] pulling latest data from origin/main ..."
git pull --ff-only origin main

restarted=0
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1 && docker compose ps -q >/dev/null 2>&1; then
    echo "[$(date '+%F %T')] docker compose service detected: rebuilding image and recreating container ..."
    docker compose up -d --build
    restarted=1
  elif command -v docker-compose >/dev/null 2>&1 && docker-compose ps -q >/dev/null 2>&1; then
    echo "[$(date '+%F %T')] docker-compose service detected: rebuilding image and recreating container ..."
    docker-compose up -d --build
    restarted=1
  fi
fi

if [ "$restarted" -eq 0 ]; then
  echo "[$(date '+%F %T')] no docker compose service running; data pulled only."
  echo "    restart your own service (e.g. node server.js) for the changes to take effect."
fi

echo "[$(date '+%F %T')] refresh complete."
