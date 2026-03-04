# Task 631: Add Focus-Visible Styles and Reduced-Motion Media Query

Status: DONE

## Problem
1. Interactive elements lack `:focus-visible` styles for keyboard navigation
2. No `@media (prefers-reduced-motion)` to disable animations (WCAG 2.3.3)

## Solution
Added `:focus-visible` outline styles for links, buttons, inputs, tabs, and menu items. Added reduced-motion media query to disable all CSS animations and transitions. Added E2E test verifying both rules are present.

## Files Modified
- `ts/src/templates.ts` — Added focus-visible and reduced-motion CSS rules
- `ts/e2e/reports.spec.ts` — Added CSS accessibility rules E2E test
