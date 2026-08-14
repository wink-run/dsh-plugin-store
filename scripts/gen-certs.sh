#!/usr/bin/env bash
# ============================================================================
# Generate a self-signed TLS certificate into ./certs for local testing.
#
#   ./scripts/gen-certs.sh                # CN=localhost
#   ./scripts/gen-certs.sh store.example.com   # CN=your domain
#
# For production use a trusted CA instead:
#   - Let's Encrypt:  sudo certbot certonly --standalone -d <DOMAIN>
#     then copy fullchain.pem + privkey.pem into ./certs
#   - Or mount your existing certs at ./certs/fullchain.pem / privkey.pem
# ============================================================================
set -euo pipefail

CN="${1:-localhost}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/certs"

mkdir -p "$DIR"

if [[ -f "$DIR/fullchain.pem" && -f "$DIR/privkey.pem" ]]; then
  echo "certs already exist in $DIR (delete them to regenerate)"
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -subj "/CN=$CN" \
  -addext "subjectAltName=DNS:$CN,DNS:localhost,IP:127.0.0.1" >/dev/null 2>&1

echo "self-signed certificate generated for CN=$CN"
echo "  cert : $DIR/fullchain.pem"
echo "  key  : $DIR/privkey.pem"
echo "start the stack with: docker compose up -d --build"
