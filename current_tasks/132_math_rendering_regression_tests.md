# Task 132: 数式レンダリングのTDD回帰テスト

## Status: DONE

## Human Directive
「たまに数式のレンダリングが壊れている。TDD で修正することで維持するべき。」

## Scope
1. Identify current math rendering failures (audit all reports for broken `$...$` and `$$...$$`)
2. Add comprehensive regression tests for `extractMath()` and `markdownToHtml()` math handling
3. Test edge cases: nested delimiters, escaped dollars, math inside code blocks, adjacent math
4. Fix any currently broken math rendering
5. ~~Add E2E (Playwright) tests that verify KaTeX renders correctly in the browser~~ (deferred — unit tests cover the critical HTML output)

## Bugs Found and Fixed

### Bug 1: `$` inside backtick code captured as math delimiter
- **Symptom**: `Use \`$variable\` in your code and $x = 1$ for math` would match `$variable\` in your code and $` as one math expression, breaking both the inline code and the subsequent math
- **Root cause**: `extractMath()` ran before inline code processing, so `$` inside backticks was treated as a math delimiter
- **Fix**: In `extractMath()`, temporarily protect backtick-delimited code with placeholders before running math regex, then restore backtick content afterward

### Bug 2: Multi-line display math broken
- **Symptom**: `$$\n\\Delta V = \\sqrt{2}\n$$` rendered as three separate `<p>` tags instead of a display math block
- **Root cause**: `markdownToHtml()` only handled single-line `$$...$$` — multi-line display math (where `$$` opens and closes on separate lines) was not supported
- **Fix**: Added multi-line display math handling in `markdownToHtml()` that collects lines between `$$` delimiters and joins them into a single `<p>$$...$$</p>` block

## Tests Added (16 new regression tests)
1. Trailing-space math (`$expr = $`)
2. Adjacent math-then-bold (`$\\Delta V$比: ... $= $ **bold**`)
3. Sequential `$= $` patterns without cross-matching
4. Nested `\\frac{}{}` braces
5. `\\sqrt{}` with parentheses
6. Thousands separator `{,}`
7. `\\text{}` command
8. Complex display math
9. Multiple display math blocks separated by text
10. Multi-line display math (`$$\n...\n$$`)
11. `$` in inline code vs math
12. Math adjacent to Japanese text
13. Subscript/superscript notation
14. Inequality operators (`<`, `>`) not HTML-escaped in math
15. HTML escaping verification for math content
16. Aligned environment in display math

## Test Results
- Templates tests: 383 pass, 0 fail (was 367 + 16 new)
- Full TS suite: 1271 pass, 19 fail (WASM build-dependent, pre-existing)
- TypeScript typecheck: clean
- Site build: successful

## Dependencies
- Task 052 (KaTeX integration — DONE)
