# Task 393: Fix Ship-Kestrel Power Budget Chart Not Rendering

## Status: **DONE**

## Summary

ship-kestrel.md has a `bar-chart:` directive (line 555) for power budget comparison, but this format doesn't match the summary MDX parser's fence regex. Same type of bug as Task 392. Convert to supported `chart:bar` YAML format.

## Rationale
- Rendering bug — power budget visualization is silently broken
- Same class of bug as Task 392 (unsupported directive format)
