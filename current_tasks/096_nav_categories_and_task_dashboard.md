# Task 096: Nav Categories + Task Status Dashboard

## Status: TODO

## Motivation
Human directives:
- AI コスト分析と考察技術解説はカテゴリをまとめてヘッダに足したい
- current_task の status とサマリーをまとめたものも見られるようにしたい

## Scope
1. Add new nav dropdown categories:
   - "AI分析" or similar: AI costs page, cost comparison
   - "技術解説" or similar: tech overview, science accuracy
   - Or merge these into existing "総合分析" dropdown with sub-grouping
2. Create a task status dashboard page on GitHub Pages:
   - Read current_tasks/*.md files during build
   - Display status (DONE/TODO/IN_PROGRESS), title, summary
   - Show progress statistics (completed/total)
   - Link to related commits/sessions where possible

## Notes
- Dashboard should be auto-generated from task files during site build
- Consider grouping tasks by category/phase
