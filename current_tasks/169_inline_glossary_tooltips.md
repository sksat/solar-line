# Task 169: Inline Glossary Tooltips

Status: DONE

## Goal
Add inline hover tooltips for glossary terms throughout report text. Currently, glossary terms are only shown as a static table at the bottom of each report. Inline tooltips make technical terms accessible right where they're used, without readers needing to scroll to the glossary.

## Background
Codex consultation identified this as the highest-impact reader-experience improvement:
- Target audience (SF anime fans) asks "is this plausible?", not "is this numerically precise?"
- Inline definitions reduce friction for readers unfamiliar with orbital mechanics
- Improves accessibility without changing analysis depth

## Approach
1. Add `wrapGlossaryTerms(html, terms)` function in templates.ts
   - Scans rendered HTML text content (not inside tags/attributes) for glossary terms
   - Wraps first occurrence per section in `<span class="glossary-term" tabindex="0">` with tooltip
   - Handles term variants (e.g., "ΔV" and "デルタV")
2. Add CSS for `.glossary-term` hover/focus tooltip
3. Apply to both episode and summary report renderers
4. Write unit tests + E2E test

## Result
- `wrapGlossaryTerms()` function added to templates.ts
- CSS for `.glossary-term` hover/focus tooltip with dark theme
- Applied to both `renderEpisode` and `renderSummaryPage`
- Skip tags: code, pre, script, a, button, h1-h4, th, svg, style
- 14 unit tests + 2 E2E tests (93 total E2E, 1462 total unit)
- Terms dotted-underlined in accent color, tooltip on hover/focus
- Accessible: tabindex="0", role="tooltip"

## Dependencies
- Existing glossary data in all episode and summary reports
- GlossaryTerm type in report-types.ts
