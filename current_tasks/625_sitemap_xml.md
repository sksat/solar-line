# Task 625: Generate sitemap.xml in Build Pipeline

Status: DONE

## Problem
The published GitHub Pages site has no sitemap.xml. This means search engines cannot efficiently discover all episode analysis, summary, and transcription pages. For a content-heavy analysis site, a sitemap helps discoverability.

## Solution
Add sitemap.xml generation to the build pipeline. The sitemap should list all published HTML pages (episodes, summaries, transcription, calculator, explorer, logs, ADRs, ideas).

## Files to Modify
- `ts/src/build.ts` — Add sitemap generation step at the end of the build
