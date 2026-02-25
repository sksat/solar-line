# Task 168: EP05 YouTube Video ID Monitoring

Status: TODO

## Goal
Add EP05 YouTube video ID and auto-generated subtitles when the video is uploaded to YouTube.

## Background
EP05 (SOLAR LINE Part5 END) was uploaded to Niconico (sm45987761) on 2026-02-24.
Parts 1-4 all received YouTube uploads after Niconico release. YouTube upload expected.

## Actions When Available
1. Add YouTube video card to `reports/data/episodes/ep05.json`
2. Update `MEMORY.md` with the YouTube video ID
3. Run `npm run collect-subtitles` to fetch YouTube VTT
4. Compare against existing Whisper transcription
5. Update DAG source node if needed

## Search
- "SOLAR LINE Part5" ゆえぴこ 良いソフトウェアトーク劇場
- YouTube playlist: PLsrZ6S47a4FuZHMV5_F6ePsOd3AZ5h_xX
