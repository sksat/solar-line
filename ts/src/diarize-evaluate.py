#!/usr/bin/env python3
"""
Evaluate speaker embedding quality for VOICEROID content.

Extracts Resemblyzer embeddings aligned to known Phase 2 dialogue timestamps,
and measures how well embeddings cluster by speaker.

This determines whether speaker embedding approaches are viable for VOICEROID.
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

    print("=== VOICEROID Speaker Embedding Quality Evaluation ===\n")

    # Load audio
    import librosa
    print("Loading audio...")
    wav, sr = librosa.load(str(audio_path), sr=16000, mono=True)
    print(f"  Audio: {len(wav)/sr:.1f}s\n")

    # Load dialogue with known speakers
    with open(dialogue_path) as f:
        dialogue = json.load(f)

    entries = dialogue["dialogue"]
    print(f"  Phase 2 dialogue entries: {len(entries)}")

    # Count speakers
    speaker_counts = {}
    for e in entries:
        s = e.get("speakerId", "unknown")
        speaker_counts[s] = speaker_counts.get(s, 0) + 1
    print("  Speaker distribution:")
    for s, c in sorted(speaker_counts.items(), key=lambda x: -x[1]):
        print(f"    {s}: {c}")
    print()

    # Extract embeddings per known dialogue entry
    from resemblyzer import VoiceEncoder, preprocess_wav
    encoder = VoiceEncoder()

    speaker_embeddings = {}  # speaker -> list of embeddings
    skipped = 0

    print("Extracting embeddings for each dialogue entry...")
    for e in entries:
        start_ms = e.get("startMs", 0)
        end_ms = e.get("endMs", start_ms + 3000)
        speaker = e.get("speakerId", "unknown")

        start_sample = int(start_ms / 1000 * sr)
        end_sample = int(end_ms / 1000 * sr)
        chunk = wav[start_sample:end_sample]

        if len(chunk) < sr * 0.3:
            skipped += 1
            continue

        processed = preprocess_wav(chunk, source_sr=sr)
        if len(processed) < 1:
            skipped += 1
            continue

        emb = encoder.embed_utterance(processed)

        if speaker not in speaker_embeddings:
            speaker_embeddings[speaker] = []
        speaker_embeddings[speaker].append(emb)

    print(f"  Extracted embeddings for {sum(len(v) for v in speaker_embeddings.values())} entries")
    print(f"  Skipped: {skipped}")
    print()

    # Analysis 1: Intra-speaker vs inter-speaker cosine similarity
    print("=== Cosine Similarity Analysis ===\n")

    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    speakers = sorted(speaker_embeddings.keys())
    speaker_centroids = {}

    for s in speakers:
        embs = np.array(speaker_embeddings[s])
        centroid = embs.mean(axis=0)
        centroid /= np.linalg.norm(centroid)
        speaker_centroids[s] = centroid

        # Intra-speaker similarity
        if len(embs) >= 2:
            sims = []
            for i in range(min(len(embs), 50)):
                for j in range(i + 1, min(len(embs), 50)):
                    sims.append(cosine_similarity(embs[i], embs[j]))
            mean_sim = np.mean(sims)
            std_sim = np.std(sims)
            print(f"  {s}: intra-speaker similarity = {mean_sim:.3f} ± {std_sim:.3f} "
                  f"(n={len(embs)})")
        else:
            print(f"  {s}: only {len(embs)} embedding(s), skipping intra-speaker")

    # Inter-speaker similarity (centroid distances)
    print("\n  Inter-speaker centroid similarity:")
    for i, s1 in enumerate(speakers):
        for s2 in speakers[i + 1:]:
            sim = cosine_similarity(speaker_centroids[s1], speaker_centroids[s2])
            print(f"    {s1} ↔ {s2}: {sim:.3f}")

    # Analysis 2: Classification accuracy using nearest-centroid
    print("\n=== Nearest-Centroid Classification ===\n")
    correct = 0
    total = 0
    confusion = {}

    for true_speaker, embs in speaker_embeddings.items():
        for emb in embs:
            best_speaker = None
            best_sim = -1
            for s, centroid in speaker_centroids.items():
                sim = cosine_similarity(emb, centroid)
                if sim > best_sim:
                    best_sim = sim
                    best_speaker = s

            total += 1
            if best_speaker == true_speaker:
                correct += 1

            key = (true_speaker, best_speaker)
            confusion[key] = confusion.get(key, 0) + 1

    accuracy = correct / total if total > 0 else 0
    print(f"  Overall nearest-centroid accuracy: {accuracy:.1%} ({correct}/{total})")

    # Focus on main speakers (kiritan vs kestrel-ai)
    main_correct = 0
    main_total = 0
    for true_speaker in ["kiritan", "kestrel-ai"]:
        if true_speaker not in speaker_embeddings:
            continue
        for emb in speaker_embeddings[true_speaker]:
            best_speaker = None
            best_sim = -1
            for s in ["kiritan", "kestrel-ai"]:
                if s in speaker_centroids:
                    sim = cosine_similarity(emb, speaker_centroids[s])
                    if sim > best_sim:
                        best_sim = sim
                        best_speaker = s
            main_total += 1
            if best_speaker == true_speaker:
                main_correct += 1

    if main_total > 0:
        main_accuracy = main_correct / main_total
        print(f"  きりたん vs ケイ binary accuracy: {main_accuracy:.1%} ({main_correct}/{main_total})")

    # Confusion matrix for main speakers
    print("\n  Confusion (true → predicted):")
    for true_s in speakers:
        row = []
        for pred_s in speakers:
            count = confusion.get((true_s, pred_s), 0)
            if count > 0:
                row.append(f"{pred_s}:{count}")
        if row:
            print(f"    {true_s} → {', '.join(row)}")

    # Summary
    print("\n=== Summary ===")
    kiritan_kei_sim = cosine_similarity(
        speaker_centroids.get("kiritan", np.zeros(256)),
        speaker_centroids.get("kestrel-ai", np.zeros(256))
    )
    print(f"  きりたん-ケイ centroid similarity: {kiritan_kei_sim:.3f}")
    if kiritan_kei_sim > 0.85:
        print("  → HIGH similarity: Resemblyzer struggles to distinguish these VOICEROID voices")
        print("  → Speaker diarization will have limited accuracy for this content")
    elif kiritan_kei_sim > 0.7:
        print("  → MODERATE similarity: Some separation possible but noisy")
        print("  → Diarization may help as a weak signal, not a strong classifier")
    else:
        print("  → GOOD separation: Diarization is viable for these speakers")

    # Save evaluation results
    results = {
        "episode": 1,
        "speakers": {
            s: {
                "numEmbeddings": len(embs),
                "centroid": speaker_centroids[s].tolist(),
            }
            for s, embs in speaker_embeddings.items()
            if s in speaker_centroids
        },
        "interSpeakerSimilarity": {
            f"{s1}_vs_{s2}": float(cosine_similarity(
                speaker_centroids[s1], speaker_centroids[s2]
            ))
            for i, s1 in enumerate(speakers)
            for s2 in speakers[i + 1:]
            if s1 in speaker_centroids and s2 in speaker_centroids
        },
        "nearestCentroidAccuracy": accuracy,
        "binaryAccuracy_kiritan_kei": main_accuracy if main_total > 0 else None,
        "conclusion": (
            "high_similarity" if kiritan_kei_sim > 0.85
            else "moderate_similarity" if kiritan_kei_sim > 0.7
            else "good_separation"
        ),
    }

    eval_path = "reports/data/episodes/ep01_diarization_eval.json"
    with open(eval_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  Evaluation saved to: {eval_path}")


if __name__ == "__main__":
    main()
