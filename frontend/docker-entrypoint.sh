#!/bin/sh

# docker-entrypoint.sh
# This script generates env.js at container runtime with environment variables

set -e

# Default value if not provided
API_BASE_URL="${VITE_API_BASE_URL:-/api}"

echo "[entrypoint] Generating env.js with runtime configuration..."
echo "[entrypoint] VITE_API_BASE_URL=${API_BASE_URL}"

# Write the env.js file
cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_API_BASE_URL: "${API_BASE_URL}"
};
EOF

echo "[entrypoint] env.js created successfully:"
cat /usr/share/nginx/html/env.js

# Execute the CMD from Dockerfile (start nginx)
exec "$@"