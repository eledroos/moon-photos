#!/usr/bin/env bash
set -euo pipefail

echo "=== Artemis II Static Build ==="

# 1. Ensure assets
echo "[1/4] Checking assets..."
npm run setup 2>/dev/null || true

# 2. Ensure config
if [ ! -f config.json ]; then
  if [ -f config.example.json ]; then
    echo "[!] No config.json — copying from config.example.json"
    cp config.example.json config.json
  else
    echo "[!] ERROR: No config.json or config.example.json"
    exit 1
  fi
fi

# 3. Fetch data using the proper script file
echo "[2/4] Fetching mission data from NASA APIs..."
npx tsx scripts/fetch-data.ts

# 4. Copy data into public/ so Vite bundles it as static files
echo "[3/4] Bundling data as static assets..."
mkdir -p public/api
cp data/trajectory.json public/api/trajectory.json
cp data/moon.json public/api/moon.json
cp data/sun.json public/api/sun.json
cp data/photos.json public/api/photos.json
echo "{\"mode\":\"static\",\"builtAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > public/api/status.json

# 5. Build frontend
echo "[4/4] Building frontend..."
npx vite build

echo ""
echo "=== Build complete ==="
echo "Output: dist/"
