# Task 080: ヘッダーナビの各話・総合分析ドロップダウン分離

## Status: DONE

## Motivation

Human directive: 「ヘッダーでは、各話分析と総合分析をそれぞれ選択できるやつがほしい」

## Completed

- Split "分析レポート" dropdown into two separate dropdowns:
  - 各話分析: EP01-EP05 episode page links
  - 総合分析: Cross-episode, ship, science accuracy, communications, tech overview
- Added NavEpisode interface and episodes parameter to layoutHtml
- Updated all render functions to accept and pass navEpisodes
- Updated build pipeline to create navEpisodes from manifest
- All 965 tests pass, typecheck clean
