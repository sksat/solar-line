# Task 052: Math Formula Rendering (KaTeX)

## Status: DONE (completed 2026-02-24)

## Motivation
Human directive: 数式はいいかんじにレンダリングされてほしい。
Reports contain ΔV formulas, vis-viva equations, Tsiolkovsky equation, etc. that currently render as plain text.

## Scope
1. Add KaTeX CSS + JS to report layout (CDN or bundled)
2. Update markdownToHtml to detect and render math blocks (`$...$` inline, `$$...$$` display)
3. Audit existing reports for formulas that should use KaTeX
4. Write tests for math rendering in markdown

## Implementation Summary
- KaTeX v0.16.21 loaded from CDN (CSS + JS + auto-render contrib)
- `extractMath()` function protects `$...$` and `$$...$$` from HTML escaping in `inlineFormat()`
- Display math `$$...$$` on standalone lines handled at block level in `markdownToHtml()`
- `boundaryCondition`, verification table `reference`/`source`, and comparison table cells now use `inlineFormat()` for math support
- Converted formulas in: ep01 (3), ep02 (3), ep03 (1), ep04 (1), ep05 (1), science-accuracy (4), cross-episode (5)
- 8 new tests added for math rendering
- All 911 TS tests + 110 Rust tests pass; site builds successfully

## Notes
- KaTeX is lighter than MathJax, better suited for static sites
- Must work with existing WASM calculator pages
