# Task 140: Remaining Quality Fixes from Review

## Status: DONE

## Motivation
Task 139 review identified several unfixed issues. Some are CLAUDE.md violations that need immediate attention.

## Scope

### HIGH: Character Name Violations (CLAUDE.md: "Never fabricate character names")
- `infrastructure.json`: "船乗り（ライ）" — ライ is not an explicitly given name
- `other-ships.json`: Uses ライ as character name
- `ep05_dialogue.json`: Scene description uses "ガニメデのライ"
- Fix: Replace all instances with "船乗り" or "ガニメデの船乗り"

### MEDIUM: Report Contextual Introductions
- `infrastructure.json` and `other-ships.json` lack introductions for new readers
- Add brief context explaining SOLAR LINE premise before diving into analysis

### LOW (tracked, not addressed this task):
- EP05 missing glossary for technical terms
- 蘇生変形 (creep deformation) undefined for readers
- Nozzle burn time distribution vs thrust profile inconsistency

## Depends on
- Task 139 (review that identified these issues)
