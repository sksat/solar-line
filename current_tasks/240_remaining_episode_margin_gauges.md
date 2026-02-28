# Task 240: Add Margin Gauges to EP01, EP02, EP03

## Status: DONE

## Description

Complete the margin gauge deployment across all episodes. EP04 and EP05 already have gauges (Task 239). Add gauges to EP01 (mass boundary, transfer time), EP02 (escape velocity), and EP03 (nav accuracy, mass boundary 452.5t).

## Scope

### EP01
- Mass boundary: actual mass vs 299t limit
- Transfer time: 72h brachistochrone

### EP02
- Solar escape velocity: 18.38 km/s vs 18.91 km/s heliocentric (2.9% margin)
- Trim thrust transit time

### EP03
- Navigation accuracy: 0.2° error vs allowable range
- Mass boundary: actual vs 452.5t limit
- Transit time: 143h

### Tests
- E2E tests for EP01-03 margin gauges
- Article content tests
