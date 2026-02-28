# Task 209: EP01 Script Source (note.com)

## Status: NOT STARTED

## Priority: HIGH

## Objective
Incorporate the official EP01 script from the creator (ゆえぴこ) as a primary data source for transcription and analysis.

Source URL: https://note.com/yuepicos/n/n37649d99e32d

## Background
Human directive (phase 17): The creator published the EP01 script on note.com. This is an authoritative source that takes priority alongside the anime source material. It can:
1. Correct transcription errors in VTT/Whisper data
2. Provide definitive character attribution
3. Reveal dialogue/details that may be hard to catch from audio alone
4. Serve as ground truth for our dialogue pipeline accuracy measurement

## Tasks
1. Download/extract full script text from the note.com page (may need manual copy since WebFetch gets limited content)
2. Structure the script data as a new transcription layer (Layer 0: script/脚本)
3. Cross-reference script text against existing EP01 dialogue data (ep01_lines.json, ep01_dialogue.json)
4. Identify and fix any transcription discrepancies
5. Update EP01 report with script-sourced corrections and citations
6. Add the script as a source in the transcription pages (new tab alongside VTT/Whisper)
7. Update DAG with new source node

## Notes
- note.com may require manual extraction if automated scraping is limited
- This is the first official script source — may set a pattern for other episodes if more are published
- Character naming in script (ケイ vs ケストレルAI) provides canonical reference
