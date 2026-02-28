# Task 237: Add E2E Tests — attitude-control + ship-kestrel pages

## Status: DONE

## Description

Add dedicated Playwright E2E test sections for the attitude-control and ship-kestrel summary pages. These are the two most analytically rich summary reports without dedicated E2E describe blocks. The generic summary page tests (loads, TOC, tables, ep-nav-strip) already cover basic rendering — these dedicated tests verify report-specific content.

## Tests to Add

### attitude-control
- Physics tables render (pointing accuracy, flip maneuver, asymmetry)
- KaTeX display math formulas render
- All 5 episode sections present
- Evaluation summary table with checkmarks
- Glossary terms

### ship-kestrel
- Ship specs section with key parameters
- Damage timeline table renders
- Mass boundary table renders
- Nozzle lifespan section
- Propellant budget charts/tables
- Internal cross-links to episode reports
