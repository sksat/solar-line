# Task 209: EP01 Script Source (note.com)

## Status: DONE

## Priority: HIGH

## Objective
Incorporate the official EP01 script from the creator (ゆえぴこ) as a primary data source for transcription and analysis.

Source URL: https://note.com/yuepicos/n/n37649d99e32d

## Completed Work

### 1. Script extraction
- Full script extracted from note.com via HTML parsing (curl + python)
- 11 scenes, 251 lines (229 dialogue + 22 stage directions)
- Stored as `reports/data/episodes/ep01_script.json`

### 2. Layer 0 transcription infrastructure
- New `scriptSource` field added to `TranscriptionPageData` interface
- `ScriptFile` interface defined in `build.ts`
- `discoverTranscriptions()` now auto-discovers `ep{NN}_script.json` files
- Layer 0 tab rendered first (active by default) when script source exists
- Layer legend dynamically shows 3 or 4 layers based on script presence
- Source info card includes script author with link
- CSS: `.layer-0` badge (accent color), `.script-table` styles for scenes/directions

### 3. Cross-reference findings
- Script has 251 lines vs Layer 3's 151 — VTT/Whisper pipeline missed ~100 lines
- Script has 11 scenes vs Layer 3's 8
- Speaker name mapping (Script → Layer 3):
  - 主人公 → きりたん
  - ケイ → ケイ (same)
  - 組合のオペレーター → 依頼人 (script is more specific)
  - 運び屋 → 船乗り (script is more specific)
  - 火星港管制 → 火星管制
  - ガニメデ港管制 → ガニメデ管制

### 4. Updates
- `ep01_speakers.json`: Updated notes with canonical script names
- DAG: Added `src.script.ep01` (data_source) → dependencies to `report.ep01` and `src.dialogue.ep01`
- 6 new tests: 2 build tests (script discovery, no-script fallback), 4 template tests (script rendering, no-script, source info, tab ordering)
- All 1683 TS tests pass

### 5. Remaining work (not in scope for this task)
- Detailed line-by-line comparison for dialogue correction (future task)
- Script-based corrections to ep01_dialogue.json text (future task)
- Accuracy measurement: script vs VTT vs Whisper (future task)

## Notes
- This is the first official script source — the infrastructure now supports any episode
- Pattern: `ep{NN}_script.json` → auto-discovered and rendered as Layer 0 tab
- Script uses 「主人公」not「きりたん」— the character's name comes from contextual attribution, not the script itself
