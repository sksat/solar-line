# Task 622: Add Regression Test for __prepareScene Regex in Template Output

Status: DONE

## Problem
Task 620 fixed a bug where `\d` in a template literal was silently converted to `d`, producing an invalid regex `/^episode-(d+)$/` that caused EP01-EP04 inline 3D viewers to fail silently. No unit test caught this because the template literal JS output wasn't validated for correct regex patterns.

## Solution
Add a unit test in templates.test.ts that validates the built HTML output from `generateViewer3dScript` (via `renderViewer3D`) contains the correct regex pattern `/^episode-(\d+)$/` (with proper `\d`, not `d`).

## Files to Modify
- `ts/src/templates.test.ts` — Add regression test for __prepareScene regex
