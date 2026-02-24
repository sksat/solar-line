# Task 097: Epoch-Consistent Orbital Diagrams

## Status: IN_PROGRESS

## Motivation
Human directive: 惑星配置などから想定される劇内時間想定から全軌道遷移図などを更新すべき。ありえない惑星配置でのアニメーションになっていると、航路が接続していないように見える。特にクロスエピソード分析では。

## Scope
1. Use the existing ephemeris module to compute planet positions at the estimated in-story epoch
2. Update all orbital diagrams (especially cross-episode full-route diagram) to show planets at their computed positions
3. Ensure transfer arcs connect visually between correct departure/arrival positions
4. Add epoch annotation to diagrams showing the assumed date
5. The cross-episode diagram is highest priority as route continuity is most visible there

## Notes
- Ephemeris module exists (Task 037) with ~1° accuracy
- EP01-EP05 estimated timeline spans ~507 days total
- Current diagrams use fixed angles which may not reflect actual planetary geometry
