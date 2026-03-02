# Task 398: Add ID Attributes to Headings in markdownToHtml

## Status: **IN PROGRESS**

## Summary

The `markdownToHtml` function in templates.ts renders headings without `id` attributes, making intra-page anchor links impossible. For example, `#航法系不一致の物理的原因` in a link won't resolve because the `<h3>` tag has no `id`. Add slugified IDs to all rendered headings to enable anchor linking.

## Rationale
- CLAUDE.md: "Reports should link to other episode reports... use section anchors"
- Cross-episode.md has links to anchors within episode pages that can't resolve
- Summary sections already use `slugify()` for their `id` attributes — extend to inline headings

## Implementation
1. In `markdownToHtml`, add `id` attribute to all heading tags using the existing `slugify` function
2. Verify no duplicate IDs are generated
3. Test that anchor links resolve correctly
