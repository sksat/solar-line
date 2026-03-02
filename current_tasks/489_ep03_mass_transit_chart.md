# Task 489: Add Mass vs Transit Time Bar Chart to EP03

## Status: DONE

## Summary

EP01, EP04, and EP05 all had mass-vs-transit-time bar charts visualizing how ship mass affects minimum transfer time. EP03 (Enceladus→Titania 143h) was missing this chart despite having the mass boundary analysis.

Added chart showing 5 mass scenarios at 9.8 MN thrust:
- 300t: 116.6h (4.9d), 3.3G
- 452.5t (boundary): 143.2h, 2.2G — exactly achieves 143h
- 1,000t: 212.9h (8.9d), 1.0G
- 3,000t: 368.7h (15.4d), 0.33G
- 48,000t (nominal): 1,474.9h (61.5d), 0.02G

## Impact

- All episodes with brachistochrone analysis now have mass-transit charts (EP01, EP03, EP04, EP05)
- EP03's 452.5t boundary visible alongside EP01's 299t — readers see the convergence
- Log-scale visualization makes the 10x gap between boundary and nominal mass intuitive
