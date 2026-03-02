# Task 497: EP02 & EP04 Bar Chart Parity

## Status: DONE

## Summary

EP02 and EP04 each had 4 bar charts while EP01/03/05 had 5. Added one bar chart to each:

- **EP02**: Radiation escape dose chart — visualizes cumulative radiation dose at different Jupiter escape velocities vs shield budget (0.043 krad). Shows ballistic (0.310 krad, 7.2x budget), damaged thrust (0.109 krad, 2.5x), and accelerated escape (0.036 krad, within budget).

- **EP04**: Mass-vs-transit-time chart — visualizes transit time at 65% thrust (6.37 MN) for different masses: 300t (8.3d), 1000t (15.1d), 3929t boundary (30d), 10000t (47.9d), 48000t (104.9d).

## Impact

- All 5 episodes now have exactly 5 bar charts each (25 total, up from 23)
- EP02 radiation analysis gains visual clarity — the velocity threshold is immediately visible
- EP04 mass sensitivity now has both scatter plot (timeseries) and bar chart representations
