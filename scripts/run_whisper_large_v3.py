#!/usr/bin/env python3
"""
Run Whisper large-v3 on all SOLAR LINE episodes.
Outputs raw JSON to raw_data/whisper/large-v3_raw/ for each episode.

Usage: python3 scripts/run_whisper_large_v3.py [--episodes 1,2,3,4,5]
"""

import json
import sys
import time
from pathlib import Path

EPISODES = [
    {"ep": 1, "audio": "raw_data/audio/ep01_CQ_OkDjEwRk.wav", "id": "CQ_OkDjEwRk"},
    {"ep": 2, "audio": "raw_data/audio/ep02_YXZWJLKD7Oo.wav", "id": "YXZWJLKD7Oo"},
    {"ep": 3, "audio": "raw_data/audio/ep03_l1jjXpv17-E.wav", "id": "l1jjXpv17-E"},
    {"ep": 4, "audio": "raw_data/audio/ep04_1cTmWjYSlTM.wav", "id": "1cTmWjYSlTM"},
    {"ep": 5, "audio": "raw_data/audio/ep05_sm45987761.wav", "id": "sm45987761"},
]

def main():
    import whisper

    # Parse --episodes flag
    eps_to_run = [1, 2, 3, 4, 5]
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--episodes" and i < len(sys.argv) - 1:
            eps_to_run = [int(x) for x in sys.argv[i + 1].split(",")]

    out_dir = Path("raw_data/whisper/large-v3_raw")
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Loading Whisper large-v3 model...")
    t0 = time.time()
    model = whisper.load_model("large-v3")
    print(f"Model loaded in {time.time() - t0:.1f}s")

    for ep_info in EPISODES:
        ep = ep_info["ep"]
        if ep not in eps_to_run:
            continue

        audio_path = ep_info["audio"]
        out_path = out_dir / f"ep{ep:02d}_{ep_info['id']}.json"

        if out_path.exists():
            print(f"\nEP{ep:02d}: Output already exists at {out_path}, skipping")
            continue

        if not Path(audio_path).exists():
            print(f"\nEP{ep:02d}: Audio file not found: {audio_path}, skipping")
            continue

        print(f"\nEP{ep:02d}: Transcribing {audio_path}...")
        t0 = time.time()
        result = model.transcribe(audio_path, language="ja", verbose=False)
        elapsed = time.time() - t0
        print(f"EP{ep:02d}: Done in {elapsed:.1f}s — {len(result['segments'])} segments")

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"EP{ep:02d}: Saved to {out_path}")

    print("\nAll done!")


if __name__ == "__main__":
    main()
