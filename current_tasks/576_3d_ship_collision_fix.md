# Task 576: Fix 3D Ship-Planet Collision Appearance

## Status: **DONE**

## Description

Human directive phase 31: In the 3D visualization, the spaceship appears to crash
into planets. The simulation results may not be correctly visualized, and there are
discrepancies with the 2D visualization.

## Root Cause

Transfer arcs (both static rendering and animated ship path) had endpoints exactly at
planet centers. Since planets have display radii (especially 3× in full-route view),
the ship marker passed through planet spheres during departure/arrival.

## Fix

Added `offsetFromPlanet()` function that displaces arc endpoints away from planet centers
by 1.5× the planet's display radius along the transfer direction. Applied to:
- `addTransferArc()` — static arc rendering
- `loadTimeline()` — animated curve building (both orbit-based and pre-defined arcs)

The offset accounts for scene type (full-route uses 3× planet scale, local scenes use 1×).
