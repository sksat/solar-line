# Task 141: EP05 Data Fix + Report Glossary System

## Status: DONE

## Motivation
Review findings from Task 139/140 identified remaining quality issues:
1. EP05 thrust profile chart has burn time data inconsistent with nozzle life chart (16.4h discrepancy)
2. No glossary/terminology section exists across all reports — readers unfamiliar with orbital mechanics struggle with technical terms
3. 蘇生変形 (creep deformation) used in EP05 without definition
4. タイタニア vs ティタニア naming inconsistency in cross-episode report

## Scope

### HIGH: EP05 Thrust Profile Data Fix
- Burn 3 in thrust profile runs 39.9h but nozzle life chart shows 20h
- Burn 4 in thrust profile shows 11.9h but nozzle life shows 15.2h
- Total: thrust profile 71.6h vs nozzle life 55.2h (matches dialogue ケイ 12:56: "55時間12分")
- Fix thrust profile chart data to match the correct 55.2h total from nozzle analysis

### MEDIUM: Glossary System
- Add GlossaryTerm type to report-types.ts
- Add renderGlossary() to templates.ts
- Add glossary data to EP05 and shared across reports
- Terms: brachistochrone, ΔV, SOI, Hohmann, Oberth, v∞, パッチドコニック, 蘇生変形, Isp

### LOW: Naming Fix
- Normalize タイタニア/ティタニア in cross-episode.json

## Depends on
- Task 139/140 (review findings)
