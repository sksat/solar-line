# Task 315: Cross-validate orbital_3d Geometry Functions

## Status: DONE

## Description
Add cross-validation for ephemeris-independent geometry functions in orbital_3d.rs:
- saturn_ring_plane_normal (RA/Dec → ecliptic conversion for Saturn pole)
- uranus_spin_axis_ecliptic (RA/Dec → ecliptic conversion for Uranus pole)
- Constants (obliquity angles, ring dimensions)
- Inclination penalty formula: 2·v·sin(Δi/2)

These use IAU J2000 pole directions and coordinate transforms, not ephemeris lookups.
