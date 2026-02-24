# ADR-013: CDN ベースの外部ライブラリ

## Status

Accepted

## Context

レポートに数式レンダリング (KaTeX) とシンタックスハイライト (highlight.js) が必要。npm パッケージとしてバンドルするか、CDN から読み込むか。

## Decision

**KaTeX と highlight.js は CDN (cdnjs) から読み込む。**ビルドパイプラインにバンドラーを導入せず、静的 HTML + CDN スクリプトのシンプルな構成を維持する。

## Consequences

- バンドラー（webpack, esbuild 等）が不要でビルドがシンプル
- オフライン環境ではレンダリングが機能しない（外部ネットワーク依存）
- CDN の可用性に依存するが、cdnjs は高い信頼性を持つ
- ライブラリのバージョン管理は HTML テンプレート内の URL で明示的に行う
