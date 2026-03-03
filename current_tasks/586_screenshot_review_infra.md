# Task 586: Screenshot-Based Animation Review Infrastructure

## Status: **IN_PROGRESS**

## Description

Human directive phase 33 item 5: "3D 可視化を含むアニメーション可視化は実際のレンダリング結果を
少しずつ進行させたもののスクリーンショットを撮って確からしさをエージェントが確認しやすい構造に
しておくこと。"

Create infrastructure for capturing progressive animation screenshots at key time
points and presenting them in a format that agents can review for correctness.

## Plan
1. Create a Playwright-based screenshot capture script for orbital 3D viewer
2. Capture screenshots at configurable time points (start, key transfers, midpoints, end)
3. Save screenshots with metadata (time, scene, description) for review
4. Add an npm script command for easy invocation
5. Add a review summary script that agents can read

## Files
- `ts/src/screenshot-review.ts` — capture logic using Playwright
- `ts/examples/orbital-3d.html` — standalone target for screenshots
- `ts/package.json` — npm run review-screenshots command
