# Task 242: E2E Tests for science-accuracy and communications Pages

## Status: DONE

## Description

Added dedicated E2E tests for the `science-accuracy` and `communications` summary pages.

### science-accuracy page (7 tests):
- ✅ All main sections visible (検証方法, 検証スコアカード, Brachistochrone, etc.)
- ✅ Verification scorecard table structure (caption, 6+ headers, 15 data rows)
- ✅ Verification status badges present
- ✅ External source links in verification table (DOI, JPL, etc.)
- ✅ Episode comparison table renders
- ✅ Glossary terms with tooltips
- ✅ Internal cross-links to ship-kestrel resolve

### communications page (6 tests):
- ✅ All 5 episode analysis sections visible
- ✅ Communication delay profile tables with AU values
- ✅ KaTeX display math for FSPL formulas
- ✅ FSOC technical analysis section (FSOC, DSOC)
- ✅ Glossary terms with tooltips
- ✅ Conclusion section with 光速遅延 evaluation

## Stats
- E2E tests: 148 → 161 (+13)
- All 161 E2E tests pass
