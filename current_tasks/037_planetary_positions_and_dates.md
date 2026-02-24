# Task 037: Compute Planetary Positions and Solar System Dates for Orbital Transfers

## Status: DONE

## Motivation
Human directive: "軌道遷移の図において、軌道高度を変えるための必要ΔV計算しか行われておらず、実際には目的の位置(目的天体の周辺など)に到達できていないように見える。諸条件から整合する惑星の位置関係を想定し、そこから作中の太陽系日時も計算する"

Current orbital transfer analyses compute ΔV requirements for changing orbital altitude but do not verify that the destination body is actually at the arrival point. We need to:
1. For each transfer, determine what planetary configuration (angular positions) makes the transfer feasible
2. Compute the solar system date/epoch that corresponds to those configurations
3. Check consistency of these dates across episodes (the story is sequential)

## Scope
1. Add planetary position computation to orbital mechanics (Rust crate)
   - Keplerian orbit propagation for planets (approximate ephemeris)
   - Synodic period / launch window calculation
   - Phase angle at departure/arrival
2. For each transfer in ep01-ep05, determine:
   - Required planetary phase angles
   - Corresponding solar system dates (approximate epoch)
   - Whether these dates are consistent across the story timeline
3. Update orbital diagrams to show planetary positions at computed dates
4. Update reports with date/timeline analysis

## Depends on
- Orbital mechanics crate (solar-line-core)
- All episode analyses (ep01-ep05)
