#!/bin/bash
set -euo pipefail

MODEL="${MODEL:-claude-opus-4-6}"

cd /workspace

git config user.name "Claude Opus 4.6"
git config user.email "noreply@anthropic.com"

mkdir -p agent_logs

while true; do
    COMMIT=$(git rev-parse --short=6 HEAD)
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    LOGFILE="agent_logs/agent_${TIMESTAMP}_${COMMIT}.log"

    claude --dangerously-skip-permissions \
        --model "$MODEL" \
        -p "$(cat AGENT_PROMPT.md)" \
        &>> "$LOGFILE" || true

    sleep 5
done
