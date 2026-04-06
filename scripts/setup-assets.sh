#!/usr/bin/env bash
set -euo pipefail

TEXTURE_DIR="public/textures"
MODEL_DIR="public/models"
DATA_DIR="public/data"

mkdir -p "$TEXTURE_DIR" "$MODEL_DIR" "$DATA_DIR"

download() {
  local url="$1" dest="$2"
  if [ -f "$dest" ]; then
    echo "✓ Already exists: $dest"
    return
  fi
  echo "⬇ Downloading: $dest"
  curl -fsSL -o "$dest" "$url"
  echo "✓ Downloaded: $dest"
}

# Earth textures
download "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg" "$TEXTURE_DIR/earth_daymap_2k.jpg"
download "https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg" "$TEXTURE_DIR/earth_clouds_2k.jpg"

# Moon texture
download "https://www.solarsystemscope.com/textures/download/2k_moon.jpg" "$TEXTURE_DIR/moon_2k.jpg"

# Sun texture
download "https://www.solarsystemscope.com/textures/download/2k_sun.jpg" "$TEXTURE_DIR/sun_2k.jpg"

# HYG Star Catalog
download "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv" "$DATA_DIR/hyg_v41.csv"

echo ""
echo "=== Asset setup complete ==="
echo "Note: Orion MPCV model must be manually downloaded from https://nasa3d.arc.nasa.gov/detail/orion-capsule"
echo "Place the .glb file at $MODEL_DIR/orion.glb"
