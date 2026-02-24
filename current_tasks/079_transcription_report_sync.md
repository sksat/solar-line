# Task 079: 文字起こし修正時のレポート連動更新

## Status: DONE

## Motivation

Human directive: 「文字起こしのミスによる人物判定の更新などがあった際はそれを参照しているレポートも適宜更新すること。」

## Scope

- When transcription corrections (speaker names, dialogue text) are updated:
  - Update corresponding dialogue quotes in episode reports (epXX.json)
  - Verify cross-references are consistent
- Add this as a CLAUDE.md guideline for future sessions
- Consider a validation check that compares report quotes with dialogue data
