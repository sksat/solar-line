#!/usr/bin/env python3
"""
Video OCR extraction for SOLAR LINE episodes.

Extracts subtitle text and HUD/instrument panel text from video frames
using Tesseract OCR with preprocessing optimized for anime subtitle overlays.

Usage:
  python3 ts/src/video-ocr.py --episode <n> [--out-dir <path>]
  python3 ts/src/video-ocr.py --all

Dependencies:
  tesseract-ocr (system), tesseract-ocr-jpn, tesseract-ocr-eng, pytesseract, Pillow, numpy

Output:
  reports/data/episodes/epXX_ocr.json — structured OCR results per episode
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import pytesseract
from PIL import Image, ImageOps


def extract_subtitle_text(img: Image.Image, lang: str = "jpn") -> str:
    """Extract subtitle text from the bottom portion of a frame.

    SOLAR LINE subtitles are white text with dark outline/shadow,
    positioned in the bottom ~20% of the frame.
    """
    w, h = img.size
    # Crop subtitle region (bottom 20%, avoiding the very bottom letterbox)
    sub = img.crop((0, int(h * 0.72), w, int(h * 0.93)))

    # Convert to grayscale and threshold to isolate white text
    gray = sub.convert("L")
    arr = np.array(gray)
    # White subtitle text has brightness > 180
    binary = Image.fromarray((arr > 180).astype(np.uint8) * 255)

    # OCR with page segmentation mode 6 (single block of text)
    text = pytesseract.image_to_string(binary, lang=lang, config="--psm 6")
    return text.strip()


def extract_hud_text(img: Image.Image, lang: str = "eng") -> str:
    """Extract HUD/instrument panel text from the main frame area.

    SOLAR LINE HUD text is typically red/amber monospace text on dark backgrounds.
    """
    w, h = img.size
    # Focus on the upper-left quadrant where HUD text typically appears
    hud = img.crop((0, 0, int(w * 0.7), int(h * 0.75)))

    # Convert to grayscale
    gray = hud.convert("L")
    arr = np.array(gray)

    # HUD text is brighter than the dark space background
    # but dimmer than subtitle text; use lower threshold
    binary = Image.fromarray((arr > 120).astype(np.uint8) * 255)

    text = pytesseract.image_to_string(binary, lang=lang, config="--psm 6")
    return text.strip()


def process_episode(episode: int, frames_dir: Path, out_path: Path) -> dict:
    """Process all frames for an episode and extract OCR text."""
    metadata_path = frames_dir / "metadata.json"
    if not metadata_path.exists():
        print(f"  No metadata.json found in {frames_dir}", file=sys.stderr)
        return {}

    with open(metadata_path, encoding="utf-8") as f:
        metadata = json.load(f)

    results = {
        "episode": episode,
        "sourceType": "video-ocr",
        "ocrEngine": "tesseract-5.3.0",
        "ocrLanguages": {"subtitle": "jpn", "hud": "eng"},
        "preprocessingMethod": "grayscale-threshold",
        "framesDir": str(frames_dir),
        "extractedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "frames": [],
    }

    keyframes = metadata.get("keyframes", [])
    total = len(keyframes)
    print(f"  Processing {total} frames...")

    for i, kf in enumerate(keyframes):
        ts = kf["timestampSec"]
        desc = kf["description"]
        fname = kf["filename"]
        fpath = frames_dir / fname

        if not fpath.exists():
            print(f"  [{i+1}/{total}] SKIP {fname} (not found)")
            continue

        mins = ts // 60
        secs = ts % 60
        print(f"  [{i+1}/{total}] {mins:02d}:{secs:02d} {desc[:40]}...", end="")

        img = Image.open(fpath)
        subtitle = extract_subtitle_text(img)
        hud = extract_hud_text(img)

        frame_result = {
            "index": kf["index"],
            "timestampSec": ts,
            "timestampFormatted": f"{mins:02d}:{secs:02d}",
            "description": desc,
            "filename": fname,
            "subtitleText": subtitle if subtitle else None,
            "hudText": hud if hud else None,
        }
        results["frames"].append(frame_result)

        sub_len = len(subtitle) if subtitle else 0
        hud_len = len(hud) if hud else 0
        print(f" sub={sub_len}c hud={hud_len}c")

    # Summary stats
    frames_with_sub = sum(1 for f in results["frames"] if f["subtitleText"])
    frames_with_hud = sum(1 for f in results["frames"] if f["hudText"])
    results["summary"] = {
        "totalFrames": len(results["frames"]),
        "framesWithSubtitle": frames_with_sub,
        "framesWithHud": frames_with_hud,
    }

    # Write output
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"  → {out_path} ({frames_with_sub} subs, {frames_with_hud} HUD)")
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Extract OCR text from SOLAR LINE episode frames"
    )
    parser.add_argument("--episode", type=int, help="Episode number (1-5)")
    parser.add_argument("--all", action="store_true", help="Process all episodes")
    parser.add_argument(
        "--frames-dir",
        default="raw_data/frames",
        help="Base directory for extracted frames",
    )
    parser.add_argument(
        "--out-dir",
        default="reports/data/episodes",
        help="Output directory for OCR JSON",
    )
    args = parser.parse_args()

    if not args.episode and not args.all:
        parser.error("Specify --episode <n> or --all")

    episodes = list(range(1, 6)) if args.all else [args.episode]

    for ep in episodes:
        ep_str = f"ep{ep:02d}"
        frames_dir = Path(args.frames_dir) / ep_str
        out_path = Path(args.out_dir) / f"{ep_str}_ocr.json"

        print(f"\n=== Episode {ep} ===")
        if not frames_dir.exists():
            print(f"  Frames directory not found: {frames_dir}")
            continue

        process_episode(ep, frames_dir, out_path)

    print("\nDone!")


if __name__ == "__main__":
    main()
