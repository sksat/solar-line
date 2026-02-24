# Task 062: Session Log Display Improvements

## Status: DONE

## Motivation
Human directive: Claude Code session log は agent-loop の標準出力のサマリー的なやつと conversation log は分けて表示すること。

## Scope
1. **Separate summary vs conversation log**
   - Agent-loop stdout summary: high-level overview of what was done
   - Conversation log: detailed turn-by-turn dialogue
   - Display these as separate sections/tabs on the session log page

2. **Assistant labeling**
   - In conversation logs, label assistant responses as "Assistant (model)" instead of just "Assistant"
   - Update `session-log.ts` rendering

3. **Sub-agent support**
   - Parse and display sub-agent (Task tool) invocations in conversation logs
   - Show them as nested or indented sections

4. **Commit linkage**
   - Associate session logs with the commits made during that session
   - Render commit hashes as clickable links to the GitHub repository

## Dependencies
- Existing: `session-log.ts` (JSONL parser, redaction, markdown renderer)
- Need to understand JSONL format for sub-agent entries and commit references

## Notes
- This is a significant refactor of the session log pipeline
- May need to update the JSONL extraction script to capture more metadata
- GitHub URL pattern: `https://github.com/{owner}/{repo}/commit/{hash}`
