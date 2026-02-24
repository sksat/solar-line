# Task 143: EP01-EP04 用語集（Glossary）追加

## Status: DONE

## Motivation

EP05 には11項目の用語集（glossary）が追加されたが（Task 141）、EP01-EP04 には用語集がない。各話レポートで使用される専門用語を、SOLAR LINE や軌道力学に詳しくない読者向けに解説することで、レポート全体の読みやすさを向上させる。

## Scope

1. EP01-EP04 の各レポートに、その話で使用される軌道力学用語の glossary を追加
2. EP05 の既存用語を再利用しつつ、各話固有の用語も追加
3. 各話で実際に使われている用語のみ含める（不使用の用語は含めない）

## Episode-Specific Terms

- **EP01**: ΔV, brachistochrone, ホーマン遷移, 比推力(Isp), ツィオルコフスキー方程式
- **EP02**: ΔV, v∞, ホーマン遷移, SOI, オーベルト効果, 重力アシスト, エアロブレーキ, 近点
- **EP03**: ΔV, brachistochrone, ホーマン遷移, SOI, 重力アシスト, プラズモイド
- **EP04**: ΔV, brachistochrone, ホーマン遷移, プラズモイド, 磁気ノズル, フライバイ, 重力アシスト

## Notes
- GlossaryTerm type already exists in report-types.ts
- renderGlossary() and TOC integration already work
- Reuse definitions from EP05 where terms overlap
