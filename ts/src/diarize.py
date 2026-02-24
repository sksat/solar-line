#!/usr/bin/env python3
"""
Speaker diarization using Resemblyzer embeddings + spectral clustering.

Usage:
  python3 ts/src/diarize.py <audio_file> --episode <n> [--num-speakers <k>] [--out <path>]

Produces a JSON file with speaker segments that can be compared against
Phase 2 dialogue attribution data.

Dependencies:
  pip install resemblyzer spectralcluster librosa soundfile
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np


def load_audio(audio_path: str, sr: int = 16000) -> np.ndarray:
    """Load audio file and resample to target rate."""
    import librosa
    wav, _ = librosa.load(audio_path, sr=sr, mono=True)
    return wav


def segment_by_vad(wav: np.ndarray, sr: int = 16000,
                   min_segment_ms: int = 500,
                   max_segment_ms: int = 10000) -> list[dict]:
    """Segment audio using WebRTC VAD into speech chunks."""
    import webrtcvad
    vad = webrtcvad.Vad(3)  # aggressiveness 3 (most aggressive)

    # Convert to 16-bit PCM
    pcm = (wav * 32768).astype(np.int16).tobytes()

    frame_duration_ms = 30  # webrtcvad supports 10, 20, 30 ms
    frame_size = int(sr * frame_duration_ms / 1000)
    frame_bytes = frame_size * 2  # 16-bit

    segments = []
    current_start = None
    current_end = None

    for i in range(0, len(pcm) - frame_bytes, frame_bytes):
        frame = pcm[i:i + frame_bytes]
        frame_ms = int(i / 2 / sr * 1000)

        try:
            is_speech = vad.is_speech(frame, sr)
        except Exception:
            continue

        if is_speech:
            if current_start is None:
                current_start = frame_ms
            current_end = frame_ms + frame_duration_ms
        else:
            if current_start is not None:
                duration = current_end - current_start
                if duration >= min_segment_ms:
                    segments.append({
                        "startMs": current_start,
                        "endMs": min(current_end, current_start + max_segment_ms),
                    })
                current_start = None
                current_end = None

    # Handle last segment
    if current_start is not None:
        duration = current_end - current_start
        if duration >= min_segment_ms:
            segments.append({
                "startMs": current_start,
                "endMs": current_end,
            })

    # Split segments that are too long
    split_segments = []
    for seg in segments:
        duration = seg["endMs"] - seg["startMs"]
        if duration > max_segment_ms:
            n_splits = int(np.ceil(duration / max_segment_ms))
            chunk_ms = duration // n_splits
            for j in range(n_splits):
                split_segments.append({
                    "startMs": seg["startMs"] + j * chunk_ms,
                    "endMs": seg["startMs"] + (j + 1) * chunk_ms
                    if j < n_splits - 1 else seg["endMs"],
                })
        else:
            split_segments.append(seg)

    return split_segments


def extract_embeddings(wav: np.ndarray, segments: list[dict],
                       sr: int = 16000) -> np.ndarray:
    """Extract Resemblyzer embeddings for each segment."""
    from resemblyzer import VoiceEncoder, preprocess_wav

    encoder = VoiceEncoder()
    embeddings = []

    for seg in segments:
        start_sample = int(seg["startMs"] / 1000 * sr)
        end_sample = int(seg["endMs"] / 1000 * sr)
        chunk = wav[start_sample:end_sample]

        if len(chunk) < sr * 0.3:  # Minimum 300ms
            # Pad short segments
            chunk = np.pad(chunk, (0, int(sr * 0.3) - len(chunk)))

        processed = preprocess_wav(chunk, source_sr=sr)
        if len(processed) < 1:
            # Fallback: use zero embedding
            embeddings.append(np.zeros(256))
            continue

        emb = encoder.embed_utterance(processed)
        embeddings.append(emb)

    return np.array(embeddings)


def cluster_speakers(embeddings: np.ndarray,
                     num_speakers: int | None = None) -> np.ndarray:
    """Cluster embeddings into speaker groups using spectral clustering."""
    from spectralcluster import SpectralClusterer

    if num_speakers is not None:
        clusterer = SpectralClusterer(
            min_clusters=num_speakers,
            max_clusters=num_speakers,
        )
    else:
        clusterer = SpectralClusterer(
            min_clusters=2,
            max_clusters=10,
        )

    labels = clusterer.predict(embeddings)
    return labels


def format_time(ms: int) -> str:
    """Format milliseconds as MM:SS."""
    total_secs = ms // 1000
    minutes = total_secs // 60
    seconds = total_secs % 60
    return f"{minutes:02d}:{seconds:02d}"


def main():
    parser = argparse.ArgumentParser(
        description="Speaker diarization using Resemblyzer + spectral clustering"
    )
    parser.add_argument("audio", help="Path to audio file (WAV)")
    parser.add_argument("--episode", type=int, required=True,
                        help="Episode number")
    parser.add_argument("--num-speakers", type=int, default=None,
                        help="Expected number of speakers (auto-detect if not set)")
    parser.add_argument("--out", type=str, default=None,
                        help="Output JSON path")
    parser.add_argument("--compare", type=str, default=None,
                        help="Path to Phase 2 dialogue JSON for comparison")
    args = parser.parse_args()

    audio_path = Path(args.audio)
    if not audio_path.exists():
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    ep_str = f"ep{args.episode:02d}"
    out_path = args.out or f"reports/data/episodes/{ep_str}_diarization.json"

    print(f"=== Speaker Diarization: Episode {args.episode} ===")
    print(f"Audio: {audio_path}")
    print(f"Output: {out_path}")
    print()

    # Step 1: Load audio
    print("Step 1: Loading audio...")
    t0 = time.time()
    wav = load_audio(str(audio_path))
    duration_sec = len(wav) / 16000
    print(f"  Loaded {duration_sec:.1f}s audio ({duration_sec/60:.1f} min) in {time.time()-t0:.1f}s")

    # Step 2: VAD segmentation
    print("Step 2: VAD segmentation...")
    t0 = time.time()
    segments = segment_by_vad(wav)
    print(f"  Found {len(segments)} speech segments in {time.time()-t0:.1f}s")
    if not segments:
        print("  ERROR: No speech segments found!", file=sys.stderr)
        sys.exit(1)

    # Step 3: Extract embeddings
    print("Step 3: Extracting speaker embeddings...")
    t0 = time.time()
    embeddings = extract_embeddings(wav, segments)
    print(f"  Extracted {len(embeddings)} embeddings in {time.time()-t0:.1f}s")

    # Step 4: Cluster
    print(f"Step 4: Clustering speakers"
          f" (k={'auto' if args.num_speakers is None else args.num_speakers})...")
    t0 = time.time()
    labels = cluster_speakers(embeddings, args.num_speakers)
    n_clusters = len(set(labels))
    print(f"  Found {n_clusters} speaker clusters in {time.time()-t0:.1f}s")

    # Build output
    diarization_segments = []
    for seg, label in zip(segments, labels):
        diarization_segments.append({
            "startMs": seg["startMs"],
            "endMs": seg["endMs"],
            "speakerCluster": int(label),
        })

    # Cluster statistics
    cluster_stats = {}
    for seg in diarization_segments:
        c = seg["speakerCluster"]
        dur = seg["endMs"] - seg["startMs"]
        if c not in cluster_stats:
            cluster_stats[c] = {"count": 0, "totalMs": 0}
        cluster_stats[c]["count"] += 1
        cluster_stats[c]["totalMs"] += dur

    print("\nCluster Statistics:")
    for c in sorted(cluster_stats.keys()):
        stats = cluster_stats[c]
        print(f"  Cluster {c}: {stats['count']} segments, "
              f"{stats['totalMs']/1000:.1f}s total speech")

    # Step 5: Compare with ground truth if available
    comparison = None
    if args.compare:
        compare_path = Path(args.compare)
        if compare_path.exists():
            print(f"\nStep 5: Comparing with ground truth: {compare_path}")
            comparison = compare_with_ground_truth(
                diarization_segments, compare_path
            )

    # Save output
    result = {
        "schemaVersion": 1,
        "episode": args.episode,
        "audioFile": str(audio_path.name),
        "durationMs": int(duration_sec * 1000),
        "numClusters": n_clusters,
        "numSegments": len(diarization_segments),
        "segments": diarization_segments,
        "clusterStats": {
            str(k): v for k, v in cluster_stats.items()
        },
        "parameters": {
            "numSpeakersRequested": args.num_speakers,
            "vadAggressiveness": 3,
            "minSegmentMs": 500,
            "maxSegmentMs": 10000,
            "embeddingModel": "resemblyzer",
            "clusteringMethod": "spectral",
        },
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    if comparison:
        result["comparison"] = comparison

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\nOutput written to: {out_path}")
    return result


def compare_with_ground_truth(diarization_segments: list[dict],
                              dialogue_path: Path) -> dict:
    """Compare diarization clusters with Phase 2 speaker attribution."""
    with open(dialogue_path, encoding="utf-8") as f:
        dialogue = json.load(f)

    gt_entries = dialogue.get("dialogue", [])
    if not gt_entries:
        print("  No dialogue entries found in ground truth")
        return {"error": "no_dialogue_entries"}

    # Build a mapping: for each diarization segment, find the overlapping
    # ground truth entry and record (cluster, gt_speaker) pairs
    matches = []
    unmatched_diarization = 0
    unmatched_gt = set()

    for seg in diarization_segments:
        seg_start = seg["startMs"]
        seg_end = seg["endMs"]
        seg_mid = (seg_start + seg_end) / 2

        best_overlap = 0
        best_gt = None

        for gt in gt_entries:
            gt_start = gt.get("startMs", 0)
            gt_end = gt.get("endMs", gt_start + 5000)

            # Calculate overlap
            overlap_start = max(seg_start, gt_start)
            overlap_end = min(seg_end, gt_end)
            overlap = max(0, overlap_end - overlap_start)

            if overlap > best_overlap:
                best_overlap = overlap
                best_gt = gt

        if best_gt and best_overlap > 0:
            matches.append({
                "cluster": seg["speakerCluster"],
                "gtSpeaker": best_gt.get("speakerId", "unknown"),
                "overlapMs": best_overlap,
            })
        else:
            unmatched_diarization += 1

    if not matches:
        print("  No overlapping segments found")
        return {"error": "no_overlaps"}

    # Build cluster-to-speaker mapping (majority vote)
    cluster_speaker_counts = {}
    for m in matches:
        c = m["cluster"]
        s = m["gtSpeaker"]
        if c not in cluster_speaker_counts:
            cluster_speaker_counts[c] = {}
        cluster_speaker_counts[c][s] = cluster_speaker_counts[c].get(s, 0) + 1

    cluster_mapping = {}
    for c, speaker_counts in cluster_speaker_counts.items():
        majority_speaker = max(speaker_counts, key=speaker_counts.get)
        total = sum(speaker_counts.values())
        purity = speaker_counts[majority_speaker] / total
        cluster_mapping[str(c)] = {
            "majoritySpeaker": majority_speaker,
            "purity": round(purity, 3),
            "totalSegments": total,
            "speakerBreakdown": speaker_counts,
        }
        print(f"  Cluster {c} → {majority_speaker} "
              f"(purity {purity:.1%}, {total} segments)")

    # Calculate overall accuracy (using majority-vote mapping)
    correct = 0
    total = len(matches)
    for m in matches:
        c = str(m["cluster"])
        predicted = cluster_mapping[c]["majoritySpeaker"]
        if predicted == m["gtSpeaker"]:
            correct += 1

    accuracy = correct / total if total > 0 else 0
    print(f"\n  Overall accuracy (majority-vote): {accuracy:.1%} "
          f"({correct}/{total})")
    print(f"  Unmatched diarization segments: {unmatched_diarization}")

    return {
        "clusterMapping": cluster_mapping,
        "accuracy": round(accuracy, 3),
        "totalMatches": total,
        "correctMatches": correct,
        "unmatchedDiarization": unmatched_diarization,
    }


if __name__ == "__main__":
    main()
