# Task 357: CI Gate for Pages Deployment + Stats Refresh

## Status: DONE

## Description
The GitHub Pages deployment workflow (`pages.yml`) currently triggers independently of CI (`ci.yml`). This means a broken commit can be deployed to the live site even if CI fails. Add a CI gate so Pages only deploys after CI passes.

Also includes:
- Refresh stale stats in tech-overview.md (tasks: 355→357, tests: 2,949→current, commits: 496→current)
- Add a custom 404 page for better UX on invalid URLs

## Changes
- `.github/workflows/pages.yml`: Use `workflow_run` trigger to deploy only after CI passes
- `reports/data/summary/tech-overview.md`: Refresh stats
- `ts/src/templates.ts`: Add 404.html generation
- `ts/src/build.ts`: Include 404.html in build output
