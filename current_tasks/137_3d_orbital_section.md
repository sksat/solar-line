# Task 137: 3D軌道分析セクションの追加

## Status: DONE

## Motivation

CLAUDE.md 指示: 「2D 分析が成熟した後、軌道傾斜角、土星リング面幾何学、天王星自転軸の効果を考慮した 3D に拡張する」

Task 098 で Rust による 3D 軌道解析（傾斜角、Z 高さ、土星リング交差、天王星接近幾何学）は計算済みで
`reports/data/calculations/3d_orbital_analysis.json` に保存されているが、
どのレポートにも組み込まれていない。

## Scope

1. `cross-episode.json` に「3次元軌道解析」セクションを追加
   - 各遷移の黄道面からの Z 高さ
   - 2D 近似の妥当性評価（最大面変更 ~1.5%）
   - 土星リング面交差解析
   - 天王星接近幾何学（自転軸傾斜 97.8°の影響）
2. build + test 通過を確認

## Dependencies

- Task 098 (3D orbital analysis) — DONE (computation)
- Task 021 (cross-episode summary) — DONE (report structure)
