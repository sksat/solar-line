# Task 120: 台詞データID参照方式への移行＋静的検査

## Status: DONE

## Description
現在、レポート内の台詞引用は DialogueQuote 型でテキストを直接埋め込んでいる。
これを文字起こしデータ（epXX_dialogue.json）をマスターとし、IDで参照する方式に移行する。

## Implementation

### 1. DialogueLine に lineId を追加
- `subtitle-types.ts`: `DialogueLine.lineId` フィールド追加（必須）
- 命名規則: `epXX-dl-NNN` (例: `ep01-dl-001`)
- 全5エピソード（538エントリ）にlineIdを付与

### 2. DialogueQuote に dialogueLineId を追加
- `report-types.ts`: `DialogueQuote.dialogueLineId?` フィールド追加（オプショナル）
- 全63件の台詞引用を対応するdialogueLineIdにマッピング
- EP03の2件はPhase 2データに対応する台詞がないため未マッピング

### 3. ビルド時参照検証
- `build.ts`: `resolveDialogueReferences()` でビルド時に壊れた参照を検出・警告
- `discoverEpisodes()` 内で自動的に実行

### 4. 静的検査テスト (report-data-validation.test.ts)
- lineId存在チェック（全エントリにlineIdがあること）
- lineIdユニーク性チェック
- lineId命名規則チェック（epXX-dl-NNN形式）
- dialogueLineId参照整合性（存在する対話行を指していること）
- 話者名の整合性（参照先と報告書で一致すること）
- テキストの重複チェック（参照先と引用テキストが重なること）

### 5. TranscriptionPageData にも lineId を追加
- `report-types.ts`: 文字起こしページの対話データにもlineIdを通す
- `build.ts`: discoverTranscriptions()でlineIdをパススルー

## Test Results
- 227 validation tests pass (16 new tests added)
- 687 total non-WASM tests pass
- TypeScript type check passes
- Rust fmt/clippy passes

## Dependencies
- ts/src/report-types.ts（DialogueQuote型）
- reports/data/episodes/（epXX_dialogue.json）
- ts/src/templates.ts（レンダリング）
- ts/src/build.ts（ビルドパイプライン）

## Origin
人間指示: 「台詞のデータはあくまで文字起こしデータや文字起こしページの方で管理し、台詞の参照はそれをIDなどで参照することで台詞の更新に追従しやすくするとよい。事前に台詞などの参照が途切れていないかを静的検査する仕組みがあるとよりよい。」
