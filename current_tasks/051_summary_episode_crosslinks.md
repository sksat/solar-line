# Task 051: Add Episode Cross-Links in Summary Pages

## Status: DONE

## Motivation
CLAUDE.md requires: "Reports should link to other episode reports and summary pages."
Currently, episode pages link to summary pages, but **summary pages do not link back to episode pages**. When summary reports reference specific episodes (e.g., "第1話の火星→ガニメデ遷移"), readers can't click through to the detailed episode analysis.

This is a real navigation gap — the cross-episode summary, ship dossier, and science accuracy pages all reference specific episodes but have no clickable links to them.

## Scope
1. Add a standard "Episode Navigation" section or inline episode links to summary page templates
2. Parse episode references in summary report markdown content → auto-link to episode pages
3. Add episode card links in summary pages where episodes are referenced
4. Write tests for the new linking functionality
5. Verify all pages build correctly with new navigation

## Approach
- Add episode auto-linking in the markdown-to-HTML converter (templates.ts)
- Pattern: 「第N話」or 「EP0N」→ link to `../episodes/ep-00N.html`
- Also add an episode navigation strip to summary page layout

## Depends on
- Task 041 (report navigation) — DONE
- All episode analyses — DONE

## Non-Goals
- Changing episode page layout
- Adding new content to summary reports
