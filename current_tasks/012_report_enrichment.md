# Task 012: Report Enrichment — Video Embeds, Graphs, Dialogue Quotes

## Status: DONE

## Goal
Enrich episode reports with video embeds, static analysis charts, and dialogue citations.

## Depends on
- Task 005 (report pipeline)
- Task 010 (Japanese localization)

## Scope
1. Create a video card component in templates.ts for embedding YouTube and Niconico players
   - YouTube: standard iframe embed
   - Niconico: iframe embed (embed.nicovideo.jp)
   - Show both sources at the top of each episode report
2. Add dialogue quote formatting to templates.ts
   - Format: きりたん「~~~」(10:05) style citations
   - Support in TransferAnalysis or as a new field in EpisodeReport
3. Add static chart/graph support
   - SVG or canvas-based charts for analysis results (ΔV comparison bars, etc.)
   - These complement the interactive calculator, not replace it
4. Update ep01.json with video URLs and key dialogue quotes
5. Tests for new template components

## Notes
- Directive from project owner
- Reflected in CLAUDE.md under "Reports" section
- Video IDs for Episode 1: sm45280425 (Niconico), need YouTube ID
