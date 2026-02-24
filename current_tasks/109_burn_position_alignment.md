# Task 109: 軌道遷移図のバーン位置整合性修正

## Status: DONE

## Motivation

人間の指示: 「軌道遷移図において、加速点や減速点の位置がアニメーションと整合していない」

現在の軌道遷移アニメーションでは、BurnMarker の位置（加速/減速ポイント）がアニメーション上の船の位置や軌道上の物理的に正しい位置と一致していない場合がある。

## Scope

1. 各エピソードの軌道遷移図を確認:
   - EP01: 火星→木星 (brachistochrone) — 加速/減速ポイント
   - EP02: 木星脱出→土星/エンケラドス — 3つの遷移
   - EP03: エンケラドス→タイタニア — 2つの遷移
   - EP04: タイタニア出発 — 初期加速
   - EP05: 天王星→地球 — 4回点火シーケンス

2. BurnMarker の `angle` を修正:
   - brachistochrone: 加速は出発天体角度、減速は到着天体角度
   - Hohmann: 出発バーンは出発軌道上、到着バーンは到着軌道上
   - フライバイ: バーン位置は近点通過付近

3. アニメーション中の船の位置と BurnMarker の位置を一致させる:
   - `orbital-animation.js` でバーンプルームの表示タイミングを `startTime`/`endTime` と照合
   - 遷移弧の `startTime`/`endTime` とバーンのタイミングの整合性を検証

4. バリデーションテストでバーン位置の整合性を検証

## Completed Work

- Audited all 34 burn markers across 18 arc groups (5 episodes + cross-episode summary)
- **Fixed EP02 Diagram 01**: escape burn angle 0.3→3.14 (Ganymede position, not escape asymptote)
- **Fixed EP05 Diagram 03**: Jupiter→Earth leg burn times from absolute to relative coordinates
- **Fixed EP05 Diagram 03**: Jupiter approach deceleration angle 3.6214→3.6104 (matching Jupiter orbit)
- **Fixed cross-episode**: Jupiter flyby marker angle 3.14→2.993 (matching Jupiter orbit)
- **Fixed cross-episode**: EP1 acceleration angle 2.96→2.9604, EP2 departure 2.997→2.993, EP3 acceleration 2.51→2.5081, EP5 departure 4.8762→4.8758 (matching orbit definitions)
- **Improved templates.ts**: Static burn markers now placed at physics-correct orbit radius (departure at from-orbit, arrival at to-orbit, midcourse at midpoint) instead of always at midpoint radius
- **Added 50+ validation tests** in report-data-validation.test.ts:
  - Burn marker angle alignment with orbit positions (tolerance: 0.001 rad)
  - Burn timing relative coordinates (within arc duration)
  - Brachistochrone midpoint symmetry (50% ±0.1%)

## Dependencies

- Task 019 (orbital animation) — DONE
- Task 040 (burn visualization) — DONE
- Task 097 (epoch-consistent diagrams) — DONE
