#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-assets/source/generated-image-1.png}"
OUT_DIR="${2:-public/assets/pixel}"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/_extracted_preview.png"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 'magick' is required." >&2
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "Source sheet not found: $SRC" >&2
  exit 1
fi

crop_tile() {
  local name="$1"
  local geom="$2"
  magick "$SRC" -crop "$geom" +repage -fuzz 45% -transparent '#ff00ff' "$OUT_DIR/$name"
}

crop_sprite() {
  local name="$1"
  local geom="$2"
  magick "$SRC" -crop "$geom" +repage -fuzz 45% -transparent '#ff00ff' -trim +repage "$OUT_DIR/$name"
}

# Top-row generated tiles.
crop_tile tile_scrap.png          198x208+58+99
crop_tile tile_dense_scrap.png    202x208+313+99
crop_tile tile_circuit_waste.png  198x208+564+99
crop_tile tile_alloy_chunk.png    198x208+815+99
crop_tile tile_hard_junk.png      198x208+1064+100
crop_tile tile_empty.png          198x208+1295+100

# The generated sheet has no bespoke doorway prop, so use the green circuit tile as a readable entry marker.
crop_tile entrance.png            198x208+564+99

# Reuse the detailed mixed-junk tile for exterior wall chips.
crop_tile wall_chunk.png          202x208+313+99

# Middle-row generated pickups and actors.
crop_sprite drop_scrap.png        160x142+68+413
crop_sprite drop_circuit.png      142x126+298+428
crop_sprite drop_alloy.png        148x126+510+428
crop_sprite vehicle.png           310x220+890+390
crop_sprite worker_suit.png       190x210+1268+392

# Crop the actual roof cannon from the generated vehicle for turret overlay.
crop_sprite turret_barrel.png     132x62+1005+394

# Bottom-row generated enemies and projectiles.
crop_sprite enemy_crawler.png     220x198+55+680
crop_sprite enemy_flyer.png       236x170+346+708
crop_sprite enemy_bomber.png      248x224+694+672
crop_sprite projectile_player.png 150x72+1010+744
crop_sprite projectile_enemy.png  150x90+1260+742

magick montage "$OUT_DIR"/*.png -background '#2a2f38' -geometry +8+8 "$OUT_DIR/_extracted_preview.png"
echo "Extracted generated sheet assets to $OUT_DIR"
