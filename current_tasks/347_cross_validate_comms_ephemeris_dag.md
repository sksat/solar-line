# Task 347: Cross-validate remaining comms, ephemeris, orbital_3d, and DAG functions

## Status: DONE

## Description
Close cross-validation gaps for physics-critical functions that are currently unvalidated:

### Physics/calculation functions (medium priority):
1. `comm_timeline_linear()` — generates time-series of comm delays along linear trajectory (used in communications report chart)
2. `arrival_position()` — computes planet position at transfer arrival time (used in orbital diagrams)
3. `ship_planet_light_delay()` — computes delay from ship at arbitrary position to planet (used in comm analysis)
4. `out_of_plane_distance()` — ecliptic Z-height for transfer trajectories (exported but not independently verified)

### DAG utility functions (lower priority):
5. `Dag::subgraph()` — predicate-based subgraph extraction (verifiable with networkx)
6. `Dag::count_crossings()` — edge crossing count (geometric verification)

## Approach
- Export Rust function results via cross_validation_export.rs / dag_export.rs
- Write independent Python implementations in validate_supplementary.py / validate_dag.py
- Compare results at machine epsilon tolerance

## Source
Gap analysis from comprehensive cross-validation coverage audit (all 396 existing checks pass).
