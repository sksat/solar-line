---
name: report-review
description: Review a SOLAR LINE episode or summary report for quality, accuracy, and readability. Checks data integrity, Japanese text quality, and orbital mechanics correctness.
argument-hint: [episode number or "summary" or "all"]
---

# Report Quality Review

Systematic review checklist for SOLAR LINE reports.

## How to Use

Specify what to review with `$ARGUMENTS`:
- `1` through `5` — review a specific episode report
- `summary` — review all summary pages
- `all` — review everything

## Review Checklist

### 1. Data Integrity

Run the automated validation tests first:
```bash
cd ts && node --test src/report-data-validation.test.ts
```

Then manually check:
- [ ] All `transferId` references are consistent (transfers ↔ explorations)
- [ ] All `evidenceQuoteIds` reference existing `dialogueQuotes`
- [ ] `computedDeltaV` is not null where a calculation was performed
- [ ] Verdict is appropriate (not "indeterminate" for reference calculations)
- [ ] Source citations have valid URLs (not plain text)

### 2. Japanese Text Quality

- [ ] All UI text and analysis prose is in Japanese
- [ ] Character names use correct forms: きりたん, ケイ (ケストレルAI)
- [ ] Dialogue quotes match the `きりたん「…」(MM:SS)` format
- [ ] Timestamps are accurate (cross-reference with video)
- [ ] No untranslated English in body text (technical terms in English are OK)
- [ ] Terminology: "brachistochrone" preferred over ブラキストクローネ

### 3. Orbital Mechanics Accuracy

- [ ] ΔV calculations use correct formulas (vis-viva, brachistochrone)
- [ ] Units are consistent (km, km/s, seconds, AU)
- [ ] Planetary distances match ephemeris data for the given epoch
- [ ] Transfer times are physically plausible for the given ΔV and distance
- [ ] Cross-episode values are consistent (ship mass, Isp, thrust)

### 4. Report Structure

- [ ] Video cards at the top (YouTube + Niconico)
- [ ] Dialogue citations woven naturally into analysis text
- [ ] Most plausible scenario presented first
- [ ] Implausible scenarios collapsed by default (`<details>`)
- [ ] Explorations nested under parent transfers
- [ ] Orbital diagrams have animation config
- [ ] Scale legend and timeline annotations on complex diagrams

### 5. Navigation & Links

- [ ] Source citations are clickable hyperlinks
- [ ] Table of contents with section anchors
- [ ] Cross-episode links work (第N話 auto-linked)
- [ ] Summary page navigation chips present
- [ ] GitHub repo link in footer

### 6. Build Verification

```bash
cd ts && npm run build
# Verify the generated HTML looks correct
```

## Using Codex for Review

For deeper review, consult Codex:
```
/nice-friend Review the EP0$ARGUMENTS report for readability and accuracy.
Is the analysis accessible to readers unfamiliar with SOLAR LINE?
Are the orbital mechanics claims well-supported?
```

## Efficiency Notes

- Run automated tests first — they catch most data integrity issues
- Use Haiku subagents for file reading during review
- Focus Codex consultation on readability (it excels at prose review)
- Don't fix issues during review — create a separate task for fixes
