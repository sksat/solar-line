# Task 072: タイムスタンプ→動画リンク化

## Status: DONE

## Motivation

Human directive: 「動画のタイムスタンプ表示(10:00)みたいなやつは、その時点の動画へのリンクにしてほしい」

## Completed

- parseTimestamp(): MM:SS / HH:MM:SS → seconds
- timestampLink(): YouTube (?v=ID&t=N) / Niconico (?from=N) links
- Applied to: dialogue quotes, inline citations, transfer card timestamps
- 10 new unit tests
- EP01-04: YouTube links, EP05: Niconico links
