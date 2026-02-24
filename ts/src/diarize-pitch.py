#!/usr/bin/env python3
"""
Pitch-based speaker feature analysis for VOICEROID content.

VOICEROID voices may differ more in pitch/prosody than in general speaker
embeddings. This script extracts F0 (fundamental frequency) and energy
features to assess whether pitch-based features offer better separation.
"""

import json
import sys
from pathlib import Path

import numpy as np


def main():
    audio_path = Path("raw_data/audio/ep01_CQ_OkDjEwRk.wav")
    dialogue_path = Path("reports/data/episodes/ep01_dialogue.json")

    if not audio_path.exists() or not dialogue_path.exists():
        print("Required files not found", file=sys.stderr)
        sys.exit(1)

    print("=== Pitch-Based VOICEROID Speaker Analysis ===\n")

    import librosa
    print("Loading audio...")
    wav, sr = librosa.load(str(audio_path), sr=16000, mono=True)

    with open(dialogue_path) as f:
        dialogue = json.load(f)

    entries = dialogue["dialogue"]

    # Extract pitch features for each dialogue entry
    speaker_features = {}

    print("Extracting pitch features...")
    for e in entries:
        start_ms = e.get("startMs", 0)
        end_ms = e.get("endMs", start_ms + 3000)
        speaker = e.get("speakerId", "unknown")

        start_sample = int(start_ms / 1000 * sr)
        end_sample = int(end_ms / 1000 * sr)
        chunk = wav[start_sample:end_sample]

        if len(chunk) < sr * 0.3:
            continue

        # Extract F0 using librosa's pyin
        f0, voiced_flag, voiced_probs = librosa.pyin(
            chunk, fmin=50, fmax=500, sr=sr
        )

        # Filter to voiced frames only
        voiced_f0 = f0[voiced_flag]
        if len(voiced_f0) < 3:
            continue

        # Features
        features = {
            "f0_mean": float(np.mean(voiced_f0)),
            "f0_median": float(np.median(voiced_f0)),
            "f0_std": float(np.std(voiced_f0)),
            "f0_min": float(np.min(voiced_f0)),
            "f0_max": float(np.max(voiced_f0)),
            "f0_range": float(np.max(voiced_f0) - np.min(voiced_f0)),
            "energy_mean": float(np.mean(chunk ** 2)),
            "energy_std": float(np.std(chunk ** 2)),
            "voiced_ratio": float(np.sum(voiced_flag) / len(voiced_flag)),
        }

        if speaker not in speaker_features:
            speaker_features[speaker] = []
        speaker_features[speaker].append(features)

    # Analyze per speaker
    print("\n=== Per-Speaker Pitch Statistics ===\n")
    print(f"{'Speaker':<20} {'F0 Mean':>10} {'F0 Std':>10} {'F0 Range':>10} "
          f"{'Voiced%':>10} {'N':>5}")
    print("-" * 70)

    speaker_stats = {}
    for speaker in sorted(speaker_features.keys()):
        feats = speaker_features[speaker]
        f0_means = [f["f0_mean"] for f in feats]
        f0_stds = [f["f0_std"] for f in feats]
        f0_ranges = [f["f0_range"] for f in feats]
        voiced_ratios = [f["voiced_ratio"] for f in feats]

        stats = {
            "f0_mean": np.mean(f0_means),
            "f0_mean_std": np.std(f0_means),
            "f0_std_mean": np.mean(f0_stds),
            "f0_range_mean": np.mean(f0_ranges),
            "voiced_ratio_mean": np.mean(voiced_ratios),
            "n": len(feats),
        }
        speaker_stats[speaker] = stats

        print(f"{speaker:<20} {stats['f0_mean']:>8.1f}Hz {stats['f0_std_mean']:>8.1f}Hz "
              f"{stats['f0_range_mean']:>8.1f}Hz {stats['voiced_ratio_mean']:>8.1%} "
              f"{stats['n']:>5}")

    # Classification using F0 features
    print("\n=== F0-Based Classification (kiritan vs kestrel-ai) ===\n")

    if "kiritan" in speaker_features and "kestrel-ai" in speaker_features:
        kiritan_f0 = [f["f0_mean"] for f in speaker_features["kiritan"]]
        kei_f0 = [f["f0_mean"] for f in speaker_features["kestrel-ai"]]

        # Simple threshold classifier
        kiritan_mean = np.mean(kiritan_f0)
        kei_mean = np.mean(kei_f0)
        threshold = (kiritan_mean + kei_mean) / 2

        print(f"  きりたん mean F0: {kiritan_mean:.1f} Hz (std: {np.std(kiritan_f0):.1f})")
        print(f"  ケイ mean F0: {kei_mean:.1f} Hz (std: {np.std(kei_f0):.1f})")
        print(f"  Threshold: {threshold:.1f} Hz")
        print(f"  F0 difference: {abs(kiritan_mean - kei_mean):.1f} Hz")

        # Test classification
        correct = 0
        total = 0

        higher_speaker = "kiritan" if kiritan_mean > kei_mean else "kestrel-ai"
        lower_speaker = "kestrel-ai" if kiritan_mean > kei_mean else "kiritan"

        for f in speaker_features["kiritan"]:
            total += 1
            predicted = higher_speaker if f["f0_mean"] > threshold else lower_speaker
            if predicted == "kiritan":
                correct += 1

        for f in speaker_features["kestrel-ai"]:
            total += 1
            predicted = higher_speaker if f["f0_mean"] > threshold else lower_speaker
            if predicted == "kestrel-ai":
                correct += 1

        accuracy = correct / total if total > 0 else 0
        print(f"\n  F0 threshold classifier accuracy: {accuracy:.1%} ({correct}/{total})")

        # Combined features: F0 + energy + voiced ratio
        print("\n=== Multi-Feature Classification (F0 + Energy + Voiced Ratio) ===\n")

        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import cross_val_score

        # Prepare feature matrix
        X = []
        y = []
        for speaker in ["kiritan", "kestrel-ai"]:
            for f in speaker_features[speaker]:
                X.append([
                    f["f0_mean"], f["f0_std"], f["f0_range"],
                    f["f0_median"], f["energy_mean"],
                    f["voiced_ratio"],
                ])
                y.append(speaker)

        X = np.array(X)
        y = np.array(y)

        clf = RandomForestClassifier(n_estimators=100, random_state=42)
        scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")
        print(f"  Random Forest 5-fold CV accuracy: {scores.mean():.1%} ± {scores.std():.1%}")

        # Feature importances
        clf.fit(X, y)
        feature_names = ["f0_mean", "f0_std", "f0_range", "f0_median",
                         "energy_mean", "voiced_ratio"]
        importances = clf.feature_importances_
        for name, imp in sorted(zip(feature_names, importances),
                                key=lambda x: -x[1]):
            print(f"    {name}: {imp:.3f}")

    # Test on all 5 episodes
    print("\n=== Cross-Episode F0 Separation Test ===\n")
    for ep in range(1, 6):
        ep_str = f"ep{ep:02d}"
        ep_dialogue = Path(f"reports/data/episodes/{ep_str}_dialogue.json")
        ep_audio_files = list(Path("raw_data/audio").glob(f"{ep_str}_*"))

        if not ep_dialogue.exists() or not ep_audio_files:
            continue

        with open(ep_dialogue) as f:
            d = json.load(f)

        kiritan_count = sum(
            1 for e in d["dialogue"] if e.get("speakerId") == "kiritan"
        )
        kei_count = sum(
            1 for e in d["dialogue"] if e.get("speakerId") == "kestrel-ai"
        )
        total = len(d["dialogue"])
        print(f"  EP{ep:02d}: {total} entries "
              f"(kiritan={kiritan_count}, kei={kei_count})")

    # Save results
    results = {
        "episode": 1,
        "method": "pitch_features",
        "speakerStats": {
            s: {k: float(v) if isinstance(v, (float, np.floating)) else v
                for k, v in stats.items()}
            for s, stats in speaker_stats.items()
        },
        "f0ThresholdAccuracy": accuracy if "kiritan" in speaker_features else None,
        "randomForestCVAccuracy": float(scores.mean()) if "kiritan" in speaker_features else None,
    }

    out_path = "reports/data/episodes/ep01_pitch_analysis.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n  Results saved to: {out_path}")


if __name__ == "__main__":
    main()
