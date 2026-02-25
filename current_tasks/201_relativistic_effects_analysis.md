# Task 201: Relativistic Effects Analysis

## Status: DONE

## Objective
Assess whether special relativistic corrections are significant for the velocities reached in SOLAR LINE. The series depicts peak brachistochrone velocities of ~7,600 km/s (2.5% c) and cruise velocities of ~1,500 km/s. Per CLAUDE.md and human directive phase 15, we need to quantify time dilation, relativistic mass increase, and velocity addition effects.

## Scope
1. Calculate Lorentz factor γ for key velocities in each episode
2. Compute relativistic corrections to ΔV calculations (relativistic rocket equation vs classical)
3. Assess time dilation magnitude (ship time vs coordinate time)
4. Determine if corrections are significant enough to affect analysis conclusions
5. Add relativistic effects section to cross-episode summary report
6. Add unit tests for relativistic calculations in Rust core

## Key Velocities to Analyze
- EP01: Mars→Ganymede brachistochrone peak (~2,000 km/s?)
- EP02: Jupiter escape, cruise velocity ~1,500 km/s
- EP03: Enceladus→Titania brachistochrone
- EP04: Titania→Earth, 65% thrust, peak velocity
- EP05: Uranus→Earth composite route, final approach

## Deliverables
- Rust functions for relativistic corrections in solar-line-core
- Unit tests comparing classical vs relativistic results
- Cross-episode summary report section on relativistic effects
- Visualization of γ factor and time dilation across the journey

## References
- CLAUDE.md: "At velocities reaching ~1% of light speed..."
- Human directive phase 15: 相対論効果検討
