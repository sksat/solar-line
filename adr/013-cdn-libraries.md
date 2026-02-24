# ADR-013: CDN ベースの外部ライブラリ

## Status

Accepted

## Context

レポートに数式レンダリング (KaTeX) とシンタックスハイライト (highlight.js) が必要。npm パッケージとしてバンドルするか、CDN から読み込むか。

## Decision

**KaTeX と highlight.js は CDN (cdnjs) から読み込む。**ビルドパイプラインにバンドラーを導入せず、静的 HTML + CDN スクリプトのシンプルな構成を維持する。

## Alternatives Considered

- **npm バンドル (webpack/esbuild)**: オフライン動作保証、バージョン固定が容易。ただしビルドパイプラインが複雑化し、バンドラーの設定・保守コストが発生。
- **自前ホスティング**: CDN 依存なしだが、ライブラリのバージョン管理とファイルサイズがリポジトリを圧迫。
- **CDN + fallback**: CDN 不可時にローカルファイルに fallback。実装の複雑さに対してメリットが限定的。

## Assumptions

- cdnjs / jsdelivr の可用性は 99.9%+ で GitHub Pages と同等
- レポートは主にオンラインで閲覧され、オフラインアクセスの需要は低い
- バンドラーの保守コストはプロジェクトの規模に対して過大

## Consequences

- バンドラー（webpack, esbuild 等）が不要でビルドがシンプル
- オフライン環境ではレンダリングが機能しない（外部ネットワーク依存）
- CDN の可用性に依存するが、cdnjs は高い信頼性を持つ
- ライブラリのバージョン管理は HTML テンプレート内の URL で明示的に行う
