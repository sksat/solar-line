# Task 011: Session Log Collection from Conversation Logs

## Status: TODO

## Goal
Set up a pipeline to collect Claude Code conversation logs (not just stdout) and publish them to GitHub Pages.

## Depends on
- Task 005 (report pipeline)

## Scope
1. Research Claude Code conversation log format and location
2. Create a script to extract/convert conversation logs for publishing
3. Integrate with the report build pipeline
4. Ensure logs are included in GitHub Pages output

## Notes
- Directive from project owner: use conversation log, not just stdout
- Conversation logs provide richer context including tool calls and reasoning
- Reflected in CLAUDE.md under "Reports" section
