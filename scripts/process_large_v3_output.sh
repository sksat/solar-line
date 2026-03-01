#!/bin/bash
# Process Whisper large-v3 raw output through the subtitle pipeline.
# Produces _subtitle.json, _quality.json, and ep*_lines_whisper_large_v3.json
# in reports/data/episodes/

set -euo pipefail
cd "$(dirname "$0")/.."

WHISPER_RAW_DIR="raw_data/whisper/large-v3_raw"
WHISPER_OUT_DIR="raw_data/whisper/large-v3"
EPISODES_DIR="reports/data/episodes"

mkdir -p "$WHISPER_OUT_DIR"

declare -A VIDEO_IDS=(
  [1]="CQ_OkDjEwRk"
  [2]="YXZWJLKD7Oo"
  [3]="l1jjXpv17-E"
  [4]="1cTmWjYSlTM"
  [5]="sm45987761"
)

for ep in 1 2 3 4 5; do
  ep_padded=$(printf "%02d" "$ep")
  vid="${VIDEO_IDS[$ep]}"
  raw_json="${WHISPER_RAW_DIR}/ep${ep_padded}_${vid}.json"

  if [ ! -f "$raw_json" ]; then
    echo "EP${ep_padded}: No raw JSON at ${raw_json}, skipping"
    continue
  fi

  echo "=== EP${ep_padded} ==="

  # Step 1: Process raw Whisper output to subtitle.json + quality.json
  echo "  Processing raw output..."
  node --experimental-strip-types ts/src/process-whisper-output.ts \
    "$raw_json" --video-id "$vid" --out-dir "$WHISPER_OUT_DIR"

  # Step 2: Extract dialogue lines
  echo "  Extracting dialogue lines..."
  node --experimental-strip-types ts/src/extract-dialogue-from-whisper.ts \
    "${WHISPER_OUT_DIR}/${vid}_subtitle.json" \
    --episode "$ep" \
    --out-dir "$WHISPER_OUT_DIR" \
    --whisper-model "large-v3"

  # Step 3: Copy lines file to reports/data/episodes/ with large-v3 suffix
  src="${WHISPER_OUT_DIR}/ep${ep_padded}_lines.json"
  dst="${EPISODES_DIR}/ep${ep_padded}_lines_whisper_large_v3.json"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "  Copied to ${dst}"
  else
    echo "  WARNING: Lines file not found at ${src}"
  fi

  echo ""
done

echo "All episodes processed. Run accuracy report next:"
echo "  node --experimental-strip-types ts/src/transcription-accuracy-report.ts"
