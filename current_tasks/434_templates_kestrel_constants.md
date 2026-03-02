# Task 434: Replace Hardcoded Ship Parameters in templates.ts with KESTREL Constants

## Status: **DONE**

## Summary

Replace hardcoded mass (48000), thrust (9.8/6.37), and Isp values in `templates.ts` with derived values from `KESTREL` constants. Two locations: `CALC_EPISODE_PRESETS` defaults and standalone brachistochrone calculator HTML.

## Rationale
- Hardcoded literals in templates.ts won't update if KESTREL constants change
- kestrel.test.ts validates constants but can't catch template drift
- Simple fix: import KESTREL and derive display-unit values
