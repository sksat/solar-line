# Task 399: Fix Broken Anchor References to Cross-Episode Sections

## Status: **IN PROGRESS**

## Summary

Several report files reference `cross-episode.html#相対論的効果の評価--光速の1-25での補正量` but the actual slugified anchor ID is `相対論的効果の評価-光速の1〜25での補正量` (single dash, wave dash 〜 not hyphen). Fix all mismatched anchor references.

## Rationale
- Broken anchor links silently fail (page loads but doesn't scroll to section)
- CLAUDE.md: "Source citations must be clickable links"
