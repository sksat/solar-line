# Task 109: 軌道遷移図のバーン位置整合性修正

## Status: TODO

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

2. BurnMarker の `pathFraction` を修正:
   - brachistochrone: 加速は前半、減速は後半（中間点でフリップ）
   - Hohmann: 出発バーンは出発軌道上、到着バーンは到着軌道上
   - フライバイ: バーン位置は近点通過付近

3. アニメーション中の船の位置と BurnMarker の位置を一致させる:
   - `orbital-animation.js` でバーンプルームの表示タイミングを `startTime`/`endTime` と照合
   - 遷移弧の `startTime`/`endTime` とバーンのタイミングの整合性を検証

4. E2E テストでバーン位置の整合性を検証

## Dependencies

- Task 019 (orbital animation) — DONE
- Task 040 (burn visualization) — DONE
- Task 097 (epoch-consistent diagrams) — TODO
