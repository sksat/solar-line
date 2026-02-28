# Task 213: Complete ADR-015 考察→考証 rename (missed items from Task 182)

## Status: DONE

## Description

Task 182 applied the rename to templates/reports/build but missed several project-level files.
This task completes the remaining items.

## Remaining items

- [ ] CLAUDE.md line 7: "SOLAR LINE 考察" → "SOLAR LINE 考証"
- [ ] DESIGN.md line 1: "# SOLAR LINE 考察" → "# SOLAR LINE 考証"
- [ ] README.md: title, description, link text
- [ ] adr/README.md: description text + ADR-015 status Proposed→Accepted
- [ ] ts/package.json: description field
- [ ] ts/e2e/reports.spec.ts: comment
- [ ] Memory file update

## Intentionally preserved (per Task 182)

- Generic "### 考察" section headers (analytical sense)
- "ヤコビアン的考察", "軌道力学的考察" (generic analytical usage)
- Human directive verbatim quotes
- ADR-015 body text (historical discussion of the naming)
- ideas/naming_kousatsu_vs_koushou.md (historical)
