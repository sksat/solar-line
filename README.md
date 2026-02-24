# SOLAR LINE 考察

SFアニメシリーズ「SOLAR LINE」（『[良いソフトウェアトーク劇場](https://www.nicovideo.jp/user/5844196/series/531506)』by ゆえぴこ）に描かれた軌道遷移の妥当性を、実際の軌道力学に基づくΔV計算・加速度分析で検証する考察プロジェクト。

**[考察サイト (GitHub Pages)](https://sksat.github.io/solar-line/)**

## 概要

主人公きりたんが小型貨物船ケストレルで太陽系を駆ける全5話を、宇宙力学の観点から分析しています。

航路: **火星** → **ガニメデ**（木星系） → **エンケラドス**（土星系） → **タイタニア**（天王星系） → **地球**（約35.9 AU）

### 分析内容

- 全24軌道遷移のΔV計算と判定（妥当 / 条件付き / 非現実的）
- Brachistochrone航法、Hohmann遷移、重力アシストの計算
- 惑星位置のエフェメリス計算（JPL平均軌道要素）
- 通信遅延・光速制約の検証
- クロスエピソード整合性分析（船体諸元、推進剤予算、科学的精度）

## プロジェクト構成

```
crates/
  solar-line-core/    Rust: 軌道力学計算コア（外部依存なし）
  solar-line-wasm/    Rust→WASM ブリッジ（flat f64 API）
ts/
  src/                TypeScript: レポート生成、字幕処理、セッションログ
  e2e/                Playwright E2E テスト
reports/
  data/episodes/      エピソード分析データ (JSON)
  data/summary/       クロスエピソード分析 (JSON)
  logs/               Claude Code セッションログ
current_tasks/        タスク管理
ideas/                アイデア・検討メモ
```

## 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| 軌道計算 | Rust | vis-viva、Kepler解法、RK4/RK45軌道伝播、エフェメリス |
| ブラウザ計算 | WASM (wasm-pack) | レポート上でのインタラクティブ計算機 |
| レポート生成 | TypeScript (Node) | 静的サイト生成、テンプレートエンジン |
| テスト | Rust tests + Node test runner + Playwright | 1138テスト (0失敗) |
| CI/CD | GitHub Actions | Rust lint/test、TS typecheck/test、E2E、WASM build |
| 公開 | GitHub Pages | 分析レポート、セッションログ、文字起こし |

## 開発方法

このプロジェクトはClaude Codeエージェントループで自律的に開発されています（[Anthropicのパターン](https://www.anthropic.com/engineering/building-c-compiler)に準拠）。

### ローカル開発

```bash
# Rust テスト
cargo test --workspace
cargo clippy -- -D warnings
cargo fmt --check

# TypeScript（ts/ ディレクトリ内）
cd ts
npm ci
npm run typecheck
npm test

# サイトビルド（要 wasm-pack）
wasm-pack build --target nodejs --out-dir ../../ts/pkg crates/solar-line-wasm
npm run build    # → dist/

# E2E テスト
npx playwright install --with-deps chromium
npx playwright test
```

### Agent Loop Setup

```bash
# Docker でエージェント環境を構築
docker build -t solar-line-agent .
docker run -it --name solar-line -v $(pwd):/workspace solar-line-agent

# コンテナ内の初期設定
ssh-keygen -t ed25519 -N ""         # → 公開鍵を GitHub deploy key に登録
git remote set-url origin git@github.com:sksat/solar-line.git
claude /login
agent-loop

# コンテナ操作
# デタッチ: Ctrl+P, Ctrl+Q
# 別シェルで接続: docker exec -it solar-line bash
# 再接続: docker attach solar-line
# 停止/再開: docker stop solar-line / docker start -i solar-line
```

## ライセンス

分析コード・ツールはこのリポジトリに含まれます。SOLAR LINE の映像・字幕データは含まれません（gitignore済み）。分析における引用は公正使用の範囲内で行っています。
