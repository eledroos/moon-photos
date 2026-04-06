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

# 4. Trim the HYG star catalog (32MB → ~2MB) — keep only columns we render
echo "[3/5] Trimming star catalog..."
if [ -f public/data/hyg_v41.csv ]; then
  node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('public/data/hyg_v41.csv', 'utf-8').split('\n');
    const header = lines[0].split(',').map(h => h.replace(/\"/g, ''));
    const ri = header.indexOf('ra'), di = header.indexOf('dec'), mi = header.indexOf('mag'), ci = header.indexOf('ci');
    let out = 'ra,dec,mag,ci\n';
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/\"/g, ''));
      if (!cols[ri] || !cols[mi]) continue;
      const mag = parseFloat(cols[mi]);
      if (isNaN(mag) || mag > 6.5) continue;
      out += cols[ri] + ',' + cols[di] + ',' + cols[mi] + ',' + (cols[ci]||'0') + '\n';
    }
    fs.writeFileSync('public/data/hyg_v41.csv', out);
    console.log('  Trimmed to ' + (out.length / 1024 / 1024).toFixed(1) + ' MB (' + (out.split('\n').length - 1) + ' stars)');
  "
fi

# 5. Copy data into public/ so Vite bundles it as static files
echo "[4/5] Bundling data as static assets..."
mkdir -p public/api
cp data/trajectory.json public/api/trajectory.json
cp data/moon.json public/api/moon.json
cp data/sun.json public/api/sun.json
cp data/photos.json public/api/photos.json
echo "{\"mode\":\"static\",\"builtAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > public/api/status.json

# 6. Build frontend
echo "[5/5] Building frontend..."
npx vite build

echo ""
echo "=== Build complete ==="
echo "Output: dist/"
