# Task 366: Add Relativistic Effects Verification to Science-Accuracy Report

## Status: DONE

## Description
The science-accuracy report (15 verification items, 99.0% average) has zero relativistic content, despite Task 365 adding per-episode notes and the cross-episode report having comprehensive analysis. Add a verification section confirming that Newtonian mechanics analysis is valid (all corrections <0.1%).

## Changes
- `reports/data/summary/science-accuracy.md`: New relativistic effects verification section
- `ts/src/article-content-validation.test.ts`: TDD content tests
- `reports/data/summary/tech-overview.md`: Stats refresh
