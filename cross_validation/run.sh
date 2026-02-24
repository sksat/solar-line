#!/usr/bin/env bash
# Cross-validate Rust orbital mechanics against independent Python implementation.
# Requires: cargo, python3 with numpy and scipy
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/../.venv"
JSON_OUT="${SCRIPT_DIR}/rust_values.json"

echo "=== Step 1: Export Rust calculation results ==="
# Run the Rust export test and capture JSON output
cargo test --test cross_validation_export -- --nocapture 2>/dev/null \
  | grep -v '^running\|^test \|^$\|test result' \
  > "${JSON_OUT}"

echo "Exported to ${JSON_OUT}"

echo ""
echo "=== Step 2: Set up Python virtual environment ==="
if [ ! -d "${VENV_DIR}" ]; then
  python3 -m venv "${VENV_DIR}"
fi
"${VENV_DIR}/bin/pip" install --quiet numpy scipy

echo ""
echo "=== Step 3: Run Python cross-validation ==="
"${VENV_DIR}/bin/python3" "${SCRIPT_DIR}/validate.py" --json "${JSON_OUT}"
