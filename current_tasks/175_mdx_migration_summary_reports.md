# Task 175: MDX Migration for Summary Reports

## Status: TODO

## Description

Continue MDX migration from the ai-costs.md proof of concept (Task 127). Migrate remaining summary reports from JSON to MDX-like format for improved reviewability. JSON with embedded HTML/markdown is hard to review — MDX allows reviewers to focus on analysis text.

Priority order (by content complexity):
1. ship-kestrel.json — most complex, benefits most from readable format
2. cross-episode.json — narrative-heavy
3. communications.json — moderate complexity
4. science-accuracy.json
5. attitude-control.json
6. infrastructure.json
7. other-ships.json
8. tech-overview.json

## Dependencies

- MDX parser infrastructure (Task 127, DONE)
- All summary reports written

## Notes

The MDX parser already supports: YAML frontmatter, ## sections, fenced component directives (chart:bar, component:orbital-diagram, timeseries, etc.)
