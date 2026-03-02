# Task 394: Add Chart Directive Support to Episode Parser + Validation Tests

## Status: **DONE**

## Summary

Tasks 392-393 revealed unsupported directive formats silently fail. Investigation found a BIGGER issue: all 5 episode `chart:bar` blocks (Tasks 387-391) render as raw YAML text, not charts, because the episode MDX parser doesn't support the `chart` prefix.

Two-part fix:
1. Add `chart` directive support to episode MDX parser + rendering pipeline
2. Add comprehensive validation tests to prevent future format mismatches

## Rationale
- 5 bar charts across EP01-EP05 are silently broken (showing raw YAML instead of charts)
- Same class of bug as Tasks 392-393 but more widespread
- Validation tests prevent recurrence

## Implementation
1. Add `chart` to episode-mdx-parser.ts fence regex
2. Add bar chart rendering to episode template pipeline (templates.ts)
3. Add comprehensive directive format validation tests
4. Verify all episode bar charts render correctly
