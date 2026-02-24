# Task 083: コード引用のシンタックスハイライト

## Status: DONE

## Motivation

Human directive: 「コードを引用するときは syntax highlight させたい」

## Implementation

- **Library**: highlight.js v11.11.1 via CDN (same approach as KaTeX)
- **Theme**: github-dark (matches site's dark color scheme)
- **Language detection**: Extracts language tag from fenced code blocks (` ```typescript `)
- **HTML output**: `<pre><code class="language-typescript">...</code></pre>`
- **Initialization**: `hljs.highlightAll()` on DOMContentLoaded
- **CSS fix**: `pre code.hljs { background: transparent }` to prevent double-background

## Changes

- `templates.ts`: markdownToHtml() now extracts language tags, layoutHtml() includes hljs CDN
- `templates.test.ts`: 3 new tests (language class extraction, no-language fallback, XSS safety)
- 969 TS tests passing
