# Task 029: EP01 Dialogue Attribution Continuation

## Status: DONE

## Goal
Continue Phase 2 speaker attribution for Episode 1 (lines 019-087).
Previous session attributed lines 001-018 (scenes 1-2). This session completed all remaining lines.

## Progress
- [x] Lines 019-035 (scenes 3-4: Mars departure, route planning)
- [x] Lines 036-050 (scene 5: Rai encounter, container secret)
- [x] Lines 051-065 (scene 6: direct entry into Jupiter)
- [x] Lines 066-078 (scene 7: perijupiter passage, overburn)
- [x] Lines 079-087 (scenes 7-8: post-overburn, arrival at Ganymede)
- [x] Update ep01.json dialogueQuotes with improved quotes

## Results
- 86 attributed dialogue entries (line-087 excluded: music only)
- All 6 speakers represented: きりたん, ケストレルAI, 依頼人, ライ, 火星管制, ガニメデ管制
- Many multi-speaker raw lines split into individual speaker entries
- Extensive ASR correction (磁気→時期, 推進→水進, 潮力→調力, etc.)
- ep01.json updated with 6 dialogue quotes (from 3) citing key technical values
- All 493 TS + 52 Rust tests pass, site builds successfully

## Key ASR Corrections
- 時期 → 磁気 (magnetic)
- 水進 → 推進 (propulsion)
- 露出力 → 炉出力 (reactor output)
- 調力 → 潮力 (tidal force)
- コ路 → コース (course)
- 射兵 → 遮蔽 (shielding)
- 王力 → 応力 (stress)
- 待機 → 大気 (atmosphere)
- 佐々艇 → 査察艇 (inspection vessel)

## Context
- EP01: 87 extracted lines from VTT
- Speaker registry: 6 speakers (kiritan, kestrel-ai, client, rai, mars-control, ganymede-control)
- ASR quality is very poor for VOICEROID — text corrected from context

## Depends on
- Task 009 (subtitle attribution — this is a continuation)
