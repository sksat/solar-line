# Task 125: Orekit等の信頼できるシミュレータによる検算

## Status: TODO

## Description
複雑な軌道遷移の分析結果を、Orekit等の信頼できる軌道力学シミュレータで検算する。
自前のRust実装との差異を確認し、分析の信頼性を向上させる。

## Approach
1. Orekit（Java/Python）のセットアップ
2. 検算対象の選定（EP01-05の主要遷移）
3. 自前計算 vs Orekit の比較スクリプト作成
4. 差異の分析と文書化
5. 大きな差異があれば自前実装の修正

## Dependencies
- crates/solar-line-core/（自前実装）
- 各エピソードの軌道パラメータ

## Origin
人間指示: 「複雑な軌道遷移などは、Orekit などの信頼できるシミュレータで検算すること」
