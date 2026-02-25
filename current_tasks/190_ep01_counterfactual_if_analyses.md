# Task 190: EP01 Counterfactual IF Analyses

Status: CLAIMED

## Goal

Add counterfactual "IF" analyses (反事実分析) to EP01, following the pattern established in EP05 (explorations 06-07). DESIGN.md explicitly calls for exploring what would happen if characters had made different decisions.

## Background

EP05 has excellent IF analyses:
- ep05-exploration-06: What if no Jupiter flyby? (direct route = mission failure)
- ep05-exploration-07: Was there a nozzle-preserving safe route? (800h works but torpedo threat forbids it)

EP02 has one IF analysis:
- ep02-exploration-04: What if captured at a different Saturn moon?

EP01, EP03, and EP04 have zero IF analyses. Starting with EP01.

## EP01 IF Scenarios to Explore

1. **What if the 150h "normal" route was taken instead of the 72h emergency route?**
   - EP01 already has exploration-03 analyzing the 150h route conditions
   - IF analysis: given the emergency context, what would the 150h route have meant? (timeline, fuel, narrative implications)

2. **What if no Oberth effect at Mars departure?**
   - EP01 transfer involves Mars departure — what if a simple escape was used instead of powered flyby?

## Approach

- Read EP01 report structure in detail
- Design IF scenarios with clear decision forks
- Add as new exploration entries following EP05's pattern
- Include orbital diagram if applicable
- Run tests to verify

## Files to Modify

- `reports/data/episodes/ep01.md`
