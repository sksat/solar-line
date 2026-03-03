# Task 531: Verdict Policy Enforcement + Mass Timeline Tests

## Status: DONE

## Summary

Two small test improvements:
1. Enforce CLAUDE.md verdict policy: "reference" transfers must NOT use "indeterminate" verdict
2. Add mass_compute_timeline jettison-only test — currently only burn+jettison is tested

## Tests to Add

### Verdict policy (1 test)
- No transfer with verdict "indeterminate" should exist (policy says reference calcs use "reference")

### Mass timeline jettison (1 test)
- Jettison-only event: total mass decreases by exactly the jettisoned amount

## Impact

Prevents policy regression and improves mass timeline WASM coverage.
