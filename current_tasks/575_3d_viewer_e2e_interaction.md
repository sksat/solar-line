# Task 575: E2E Interaction Tests for 3D Viewer

## Status: **DONE**

## Description

Add E2E interaction tests for 3D viewer controls:
- Scene switching: click scene buttons, verify active state changes
- Speed button cycling: click through 1×, 2×, 4×, 0.5×
- View mode toggle: click to switch between 慣性 and 宇宙船

Note: WebGL canvas rendering can't be verified in headless Playwright,
so tests focus on DOM state changes from button clicks.
