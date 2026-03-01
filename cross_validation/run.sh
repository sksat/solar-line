#!/usr/bin/env bash
# Cross-validate Rust modules against independent Python implementations.
# Requires: cargo, python3 with numpy, scipy, poliastro, astropy
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/../raw_data/.venv"
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
"${VENV_DIR}/bin/pip" install --quiet numpy scipy poliastro

echo ""
echo "=== Step 3: Run scipy cross-validation ==="
"${VENV_DIR}/bin/python3" "${SCRIPT_DIR}/validate.py" --json "${JSON_OUT}"

echo ""
echo "=== Step 4: Run poliastro cross-validation ==="
"${VENV_DIR}/bin/python3" "${SCRIPT_DIR}/validate_poliastro.py" --json "${JSON_OUT}"

echo ""
echo "=== Step 5: Run supplementary module cross-validation ==="
"${VENV_DIR}/bin/python3" "${SCRIPT_DIR}/validate_supplementary.py" --json "${JSON_OUT}"
