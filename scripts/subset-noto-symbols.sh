#!/bin/sh
# Rebuild the self-hosted Noto Symbols woff2 files in src/assets/fonts (hashed by Vite).
# Requires fonttools + brotli:  pip install fonttools brotli
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/src/assets/fonts"
TMP="${TMPDIR:-/tmp}/ulune-noto-symbols"
mkdir -p "$TMP" "$OUT"

curl -fsSL -o "$TMP/NotoSansSymbols.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/notosanssymbols/NotoSansSymbols%5Bwght%5D.ttf"
curl -fsSL -o "$TMP/NotoSansSymbols2.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf"
curl -fsSL -o "$OUT/OFL.txt" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssymbols/OFL.txt"

python3 - << PY
from fontTools.varLib import instancer
from fontTools.ttLib import TTFont
font = TTFont("$TMP/NotoSansSymbols.ttf")
regular = instancer.instantiateVariableFont(font, {"wght": 400})
regular.save("$TMP/NotoSansSymbols-Regular.ttf")
PY

cat > "$TMP/s1.txt" << EOF
260A-260D
263D-2653
26B3-26BB
EOF
cat > "$TMP/s2.txt" << EOF
25A1
25B3
2609
2610
2B20
2BF0
2BF2
EOF

pyftsubset "$TMP/NotoSansSymbols-Regular.ttf" \
  --unicodes-file="$TMP/s1.txt" \
  --flavor=woff2 \
  --layout-features='*' \
  --desubroutinize \
  --no-hinting \
  --name-IDs='*' \
  --name-legacy \
  --output-file="$OUT/NotoSansSymbols-astro.woff2"

pyftsubset "$TMP/NotoSansSymbols2.ttf" \
  --unicodes-file="$TMP/s2.txt" \
  --flavor=woff2 \
  --layout-features='*' \
  --desubroutinize \
  --no-hinting \
  --name-IDs='*' \
  --name-legacy \
  --output-file="$OUT/NotoSansSymbols2-astro.woff2"

echo "Wrote $OUT/NotoSansSymbols-astro.woff2 and NotoSansSymbols2-astro.woff2"
