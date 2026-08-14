# ============================================================================
# DSH Store · production image
# nginx serves the static site, terminates TLS, and can reverse-proxy
# optional backend locations (see nginx/templates/default.conf.template).
#
#   docker build -t dsh-store:latest .
#   docker compose up -d --build
# ============================================================================

# Pin to a specific nginx version in production (e.g. nginx:1.27-alpine).
FROM nginx:alpine

# Site files (static SPA + data)
COPY index.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY data/ /usr/share/nginx/html/data/

# nginx config: /etc/nginx/templates/*.template is envsubst-processed at
# container start into /etc/nginx/conf.d/ by the official entrypoint.
# Environment variables ${DOMAIN} ${SSL_CERT} ${SSL_KEY} are substituted.
COPY nginx/templates/ /etc/nginx/templates/

# Remove the stock default server so our template owns ports 80/443.
RUN rm -f /etc/nginx/conf.d/default.conf

# Source files may arrive with restrictive modes (e.g. 0600); the nginx worker
# runs as the unprivileged "nginx" user, so guarantee world-read access.
RUN chmod -R a+rX /usr/share/nginx/html/ /etc/nginx/templates/

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz > /dev/null || exit 1
