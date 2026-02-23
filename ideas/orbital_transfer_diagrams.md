# Idea: Orbital Transfer Diagrams in Reports

## Background
Human directive: orbital transfer reports should include diagrams showing planetary orbits,
celestial body positions, and transfer trajectories for visual clarity.

## Possible Approaches
1. **SVG diagrams in templates.ts**: Generate inline SVG showing:
   - Concentric circles for planetary orbits (Mars, Jupiter, Saturn, Uranus)
   - Dots for planet positions
   - Curved lines for transfer trajectories (Hohmann ellipses, hyperbolic arcs)
   - Labels for ΔV burns, timestamps, key parameters
2. **Interactive WASM-powered diagrams**: Use the Rust orbital mechanics code to:
   - Compute and render trajectories in real-time
   - Allow users to vary parameters and see trajectory changes
   - Animate the transfer over time
3. **Static chart library**: Use a JS charting library to generate orbit plots

## Design Considerations
- SVG approach is simplest and consistent with existing renderBarChart pattern
- Need to handle logarithmic scale (Mars at 1.5 AU vs Uranus at 19.2 AU)
- Could use polar coordinates (top-down view of solar system)
- For Episode 2: show Jupiter→Saturn hyperbolic trajectory clearly

## Priority
High — visual diagrams would significantly improve report readability.
Start with static SVG, upgrade to interactive later.

## Related
- Task 008 (Episode 2 — Jupiter escape → Saturn trajectory)
- Task 012 (report enrichment)
