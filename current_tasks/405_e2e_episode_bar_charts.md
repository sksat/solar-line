# Task 405: Add E2E Tests for Episode Transfer Bar Charts

## Status: **DONE**

## Summary

Task 394 fixed episode bar chart rendering (they were silently not rendering). Add E2E tests to verify all 5 episodes render their transfer bar charts as SVG elements in the browser.

## Rationale
- Bar chart rendering was silently broken before Task 394 — E2E tests prevent regression
- Summary report bar charts already have E2E tests, but episode transfer bar charts don't
