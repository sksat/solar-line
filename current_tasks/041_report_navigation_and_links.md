# Task 041: Report Navigation and Source Link Improvements

## Status: DONE

## Motivation
Human directive: "分析レポートページの分かりやすさを適宜確認して改善すること。例えば今出典のリンクが無く出典元にジャンプできない。別レポートや別セクションにもジャンプ可能であってほしい。"

Current issues:
1. **Source citations lack clickable links** — SourceCitation type has a `url` field but it may not be rendered as a clickable hyperlink in all contexts
2. **No inter-report navigation** — Episode pages don't link to each other or to the summary
3. **No intra-page navigation** — No table of contents or section anchors for jumping within a long report

## Scope
1. Ensure all SourceCitation URLs are rendered as clickable `<a>` tags
2. Add inter-report navigation bar (episode ↔ episode, episode ↔ summary)
3. Add section anchors (`id` attributes) on transfer/exploration headings
4. Add table of contents at the top of each episode report
5. Ensure cross-episode report also has working navigation
6. Update tests for new template output

## Depends on
- Report pipeline (Task 005, 010, 012)
- Templates (templates.ts)
- All episode reports (ep01-ep05)
