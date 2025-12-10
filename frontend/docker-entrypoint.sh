#!/bin/sh
# Writes runtime env into /usr/share/nginx/html/env.js so the built static app can read it.

# Default fallback (if not provided)
: "${RUNTIME_API_URL:=}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_API_BASE_URL: "${RUNTIME_API_URL}"
};
EOF

# Print for debugging
echo "[entrypoint] Wrote /usr/share/nginx/html/env.js with VITE_API_BASE_URL=${RUNTIME_API_URL}"

# Exec the container's CMD
exec "$@"
