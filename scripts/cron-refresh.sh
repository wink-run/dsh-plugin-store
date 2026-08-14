#!/usr/bin/env bash
# ============================================================================
# DSH Store · cron refresh script
#
# Pulls the latest plugin data from origin/main, then fully recreates the
# Docker Compose service so the new data takes effect.
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

echo "[$(date '+%F %T')] stopping service ..."
docker compose down

echo "[$(date '+%F %T')] rebuilding image and starting service ..."
docker compose up -d --build

echo "[$(date '+%F %T')] refresh complete."
