# Task 052: Math Formula Rendering (KaTeX)

## Status: TODO

## Motivation
Human directive: 数式はいいかんじにレンダリングされてほしい。
Reports contain ΔV formulas, vis-viva equations, Tsiolkovsky equation, etc. that currently render as plain text.

## Scope
1. Add KaTeX CSS + JS to report layout (CDN or bundled)
2. Update markdownToHtml to detect and render math blocks (`$...$` inline, `$$...$$` display)
3. Audit existing reports for formulas that should use KaTeX
4. Write tests for math rendering in markdown

## Notes
- KaTeX is lighter than MathJax, better suited for static sites
- Must work with existing WASM calculator pages
