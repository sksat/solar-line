# Task 065: Communications Systems Analysis

## Status: TODO

## Motivation
Human directive: 通信の描写が多いのでそれについても考察したい

SOLAR LINE has extensive communication scenes. Analyzing the physics of these adds depth to the 考察.

## Scope

### Analysis Topics
1. **Light delay**: Real-time dialogue vs. light-speed delay at depicted distances
   - EP01: Mars-Ganymede distance → light delay
   - EP02: Jupiter-Saturn → light delay during 455d transit
   - EP04: Uranus-Earth → massive light delay
   - EP05: Throughout journey, how does delay change?
2. **Signal strength / link budget**: Can a ship at Saturn/Uranus maintain communication with Earth?
   - Antenna size, transmit power, data rate trade-offs
   - DSN (Deep Space Network) capabilities as reference
3. **Communication blackout scenarios**: When would communication be impossible?
   - Solar conjunction
   - During high-acceleration maneuvers
4. **In-story communication patterns**: Catalog dialogue that implies real-time communication at distances where it shouldn't be possible. Is there an in-universe explanation (relay network, quantum comms)?

### Dialogue evidence
- Extract communication-related dialogue from Phase 2 attribution data
- Note timestamps and distances for each communication scene

## Dependencies
- Dialogue attribution (Tasks 028, 029) for dialogue data
- Ephemeris (Task 037) for distance calculations
- Episode analyses for context

## Deliverables
- Light delay calculator (Rust + WASM)
- Report section analyzing communication realism
- Timeline of communication events with calculated delays
