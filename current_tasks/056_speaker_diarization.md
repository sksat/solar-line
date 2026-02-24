# Task 056: Speaker Diarization Investigation

## Status: DONE

## Motivation
Human directive: 話者分離の技術を用いるとより精度が高まるかもしれない。

## Scope
1. Research speaker diarization tools (pyannote-audio, NeMo, etc.)
2. Test on EP01 audio to evaluate VOICEROID voice separation quality
3. If viable, integrate into dialogue pipeline to aid Phase 2 attribution
4. Track model conditions in subtitle metadata

## Findings

### Tools Evaluated
- **Resemblyzer** (speaker embeddings) + **spectral clustering**: No API key required, PyTorch-based
- **pyannote-audio**: Requires HuggingFace token (not available in this environment)
- **Pitch-based features** (F0 + energy + voiced ratio): Custom analysis with librosa + scikit-learn

### Results on EP01 (19.3 min, 151 dialogue entries, 6 speakers)

| Method | きりたん-ケイ Accuracy | Notes |
|--------|----------------------|-------|
| Resemblyzer nearest-centroid | 80.3% | Centroid cosine similarity: 0.983 (near-identical) |
| F0 threshold | 56.2% | F0 difference only 28.8 Hz with ~100 Hz std |
| Random Forest (multi-feature) | 67.9% ± 3.2% | 5-fold CV, F0+energy+voiced ratio features |
| Resemblyzer spectral clustering (6 speakers) | 65.3% | Most clusters mapped to kestrel-ai |

### Cross-Episode Validation (EP05)
- きりたん-ケイ centroid similarity: 0.943 (consistent with EP01's 0.983)
- Binary accuracy: 81.1% — same pattern as EP01

### Key Insight
VOICEROID synthetic voices are **too acoustically similar** for general-purpose speaker diarization:
- Intra-speaker variation (cosine sim ~0.7) is **greater** than inter-speaker difference (cosine sim 0.98)
- Pitch ranges overlap significantly (きりたん 213.6±99.3 Hz vs ケイ 242.4±103.3 Hz)
- Non-VOICEROID speakers (火星管制 56.5 Hz, 船乗り 338.9 Hz) are distinctly different

### Conclusion
**Speaker diarization is NOT viable** as a primary tool for VOICEROID content with current general-purpose models. The 80% accuracy introduces more noise than signal compared to context-based Phase 2 attribution.

**Future opportunities:**
- Fine-tuned models on VOICEROID voices specifically (would need labeled training data — which we now have from Phase 2)
- Non-acoustic approaches: text content analysis, dialogue pattern recognition, turn-taking models
- Speaker diarization remains useful for **non-VOICEROID speakers** (管制, etc.) where acoustic differences are clear

## Artifacts
- `ts/src/diarize.py`: Speaker diarization pipeline (Resemblyzer + spectral clustering)
- `ts/src/diarize-evaluate.py`: Embedding quality evaluation against ground truth
- `ts/src/diarize-pitch.py`: Pitch-based feature analysis
- `reports/data/episodes/ep01_diarization.json`: EP01 diarization output
- `reports/data/episodes/ep01_diarization_eval.json`: Embedding evaluation results
- `reports/data/episodes/ep01_pitch_analysis.json`: Pitch analysis results

## Notes
- VOICEROID voices are synthetic — clusters poorly with general-purpose embeddings
- Resemblyzer model was not trained on synthetic speech; specialized models may perform better
- The diarization scripts are preserved for potential future use with improved models
