# Task 407: Add Detail Page Diagram/Chart ID Validation Test

## Status: **DONE**

## Summary

Detail pages in episodes reference diagram and chart IDs (diagramIds, chartIds). Add validation test ensuring these references point to existing diagrams/charts in the same episode.

## Rationale
- Completes content validation coverage alongside quote, transfer, and glossary checks
- Prevents silent failures where detail pages build but reference non-existent content
