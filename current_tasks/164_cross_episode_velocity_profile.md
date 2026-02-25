# Task 164: Cross-Episode Heliocentric Velocity Profile Chart

## Status: DONE

## Motivation

The cross-episode summary page has mass timeline and margin charts, but lacks a **heliocentric velocity profile** showing the ship's speed throughout the entire 479-day mission. This is a fundamental visualization that shows:
- Brachistochrone acceleration/deceleration phases (EP01, EP03, EP05)
- Ballistic coast velocity during EP02's 455-day Jupiter→Saturn transit
- Jupiter flyby velocity boost in EP05
- Maximum and minimum speeds during the mission

This makes the mission trajectory dynamics intuitively understandable.

## Approach

1. Compile velocity data from each episode's calculations:
   - EP01: Mars departure → Jupiter arrival (brachistochrone ΔV + orbital speeds)
   - EP02: Jupiter escape → ballistic → Saturn capture
   - EP03: Saturn → Uranus (brachistochrone)
   - EP04-05: Uranus → Earth (composite route with Jupiter flyby)
2. Create a time-series chart with mission elapsed time (days) on X-axis and heliocentric speed (km/s) on Y-axis
3. Add to the "航路の連続性" section alongside the existing full-route orbital diagram

## Data Sources

- EP calculations: `reports/data/calculations/ep0X_calculations.json`
- Cross-episode mass timeline: existing propellant-mass-timeline chart for time anchors
- Orbital mechanics: vis-viva equation for heliocentric velocities at each planet

## Dependencies

- Task 163 (DONE)
