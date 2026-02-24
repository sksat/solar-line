# Task 096: Nav Categories + Task Status Dashboard

## Status: DONE

## Motivation
Human directives:
- AI コスト分析と考察技術解説はカテゴリをまとめてヘッダに足したい
- current_task の status とサマリーをまとめたものも見られるようにしたい

## Result
1. **Nav categories** — completed in Task 121 (3 dropdowns: 各話分析 | 総合分析 | この考証について)
2. **Task status dashboard** — auto-generated from `current_tasks/*.md` during build:
   - `parseTaskFile()` + `discoverTasks()` in `build.ts` read task markdown files
   - `renderTaskDashboard()` in `templates.ts` renders progress bar, stats, and sortable table
   - Sorted: IN_PROGRESS first, then TODO, then DONE
   - Shows: task number, title, status badge, summary
   - Progress bar with SVG: done (green), in-progress (orange)
   - Nav link: 「この考証について」→「タスク状況」
   - Output: `meta/tasks.html`
   - 10 new tests across build.test.ts and templates.test.ts

## Notes
- Dashboard is auto-generated from task files during site build
- All 128 tasks discovered and rendered
