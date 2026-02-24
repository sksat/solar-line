# Task 054: IF/Counterfactual Analysis

## Status: DONE

## Motivation
Human directive: 作中の登場人物が他の判断をしていた場合の IF の分析もあるとより考察が深まる。

## Completed Counterfactuals

### EP05-exploration-06: 木星フライバイなしの直行ルート
- **Finding: 帰還不可能。** フライバイなしで燃焼56h51m → ノズル寿命55h38mを73分超過
- 残余速度93 km/s（LEO脱出速度の8.6倍）で地球を通過
- 月軌道変更でも節約わずか2.2分——全く不十分
- **結論: 木星フライバイは選択ではなく必須**

### EP05-exploration-07: ノズル温存の安全航路
- **Finding: 安全な航路は存在したが時間的に不可。**
- 800h航路で370分マージン（10.9%）だが507hより12日長い→核魚雷追撃リスク
- 低推力(50%)は逆効果（燃焼時間2倍→ノズル消失がさらに早まる）
- **結論: 65%出力はすでに致命的境界線上**

### EP02-exploration-04: エンケラドス以外の土星捕捉
- **Finding: エンケラドスが物理的にも最適解。**
- 最小捕捉ΔV: エンケラドス0.61 < レア0.88 < タイタン1.29 < SOI境界3.70 km/s
- オーベルト効果により深い軌道ほど最小ΔVが小さい（直感に反する）
- **結論: 物語の動機（ミューズ通信）と軌道力学の最適解が一致**

## Scope — All Complete
1. ✅ EP05: No Jupiter flyby (catastrophic — nozzle fails)
2. ✅ EP05: Nozzle conservation path (safe but too slow)
3. ✅ EP02: Alternative Saturn capture (Enceladus is optimal)

## Test Results
- Build: 5 episodes, 24 transfers, 3 summaries
- Tests: 914 TS (3 new from added exploration data), all pass
