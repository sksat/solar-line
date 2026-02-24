#!/usr/bin/env python3
"""
Extract key frames from SOLAR LINE episode videos for OCR analysis.

Usage:
  python3 ts/src/extract-frames.py <video_file> --episode <n> [--out-dir <path>]

Extracts frames at timestamps corresponding to instrument panel displays,
navigation data readouts, and orbital maneuver moments identified from
dialogue data.

Dependencies:
  ffmpeg (system), Pillow
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path


# Key timestamps for EP01 where on-screen data is likely visible
# These are based on dialogue analysis — moments where technical data
# is discussed and likely shown on screen
EP01_KEYFRAMES = [
    # (timestamp_seconds, description)
    (47, "反応質量タンク — instrument panel"),
    (72, "依頼表示 — ガニメデ72時間"),
    (197, "航路計算 — 火星→木星コース表示"),
    (225, "RCSプロファイル表示"),
    (285, "火星管制通信 — 安全圏表示"),
    (302, "メインアップチェック — ステータス表示"),
    (316, "核融合パルス点火 — 推力6.3MN表示"),
    (352, "巡航加速 — 速度表示"),
    (410, "航路図 — 嵐の回廊ルート"),
    (654, "木星直接エントリー — 航路計算"),
    (682, "オーバー筋 1.5RJ — 軌道パラメータ"),
    (702, "ΔV=-2.3km/s — ターゲットウィンドウ±5分"),
    (788, "ペリジュピター到達予測 — 11時間42分"),
    (813, "フルバーン — 推力9.8MN"),
    (892, "木星接近 — 直径/質量データ"),
    (923, "オーバースウィンドウ — 速度48.9km/s"),
    (961, "ピーク出力 — 再計算"),
    (1009, "ΔV残り1.8km/s"),
    (1029, "ΔV残り0.3km/s — 磁気シールド応力"),
    (1070, "ノズル塑性変形 — 船体ステータス"),
    (1115, "ガニメデ接近 — 最終アプローチ"),
]

# Key timestamps for EP02 — Jupiter escape → Saturn/Enceladus
EP02_KEYFRAMES = [
    # (timestamp_seconds, description)
    (53, "EVA — 冷却系圧力0.04MPa低下"),
    (106, "木星・イオ近傍 — 相対速度増加、3時間後最近接"),
    (118, "ケストレル船体全景 — 損傷状態"),
    (418, "木星離脱航路 — イオ・トーラス外縁スカート付近"),
    (547, "木星磁気圏縁ゲート — 高度50RJ"),
    (551, "木星基準速度10.3km/s — 扇状面同調"),
    (807, "エンケラドゥス・リレー到着"),
    (978, "外縁航路投入シークエンス開始 — 点火ウィンドウ5時間"),
    (997, "NAVIGATION OVERVIEW — COIAS軌道交差警報"),
    (1000, "NAVIGATION OVERVIEW（字幕付き）— 相対速度0.12km/s"),
    (1038, "大型船検知 — 恒星掩蔽"),
    (1048, "大型船待ち伏せ推定 — 相対速度ゼロ"),
    (1051, "きりたん・ケイ — 緊張シーン"),
]

# Key timestamps for EP03 — Enceladus → Titania (143h)
EP03_KEYFRAMES = [
    # (timestamp_seconds, description)
    (139, "外縁航路の危険性説明 — 内縁輸送向け設計"),
    (177, "目的地報告 — ウラヌス3、タイタニア集合複合施設"),
    (191, "所要時間143時間12分"),
    (198, "航路概要 — 土星重力アシスト、オービタルカーテン外側"),
    (228, "航路補正2回、最終誤差±18km"),
    (383, "火星生まれ1G — 外園居住者0.8G"),
    (823, "航法危機 — 位置14.72AU、速度3000km/s、1.23°不一致"),
    (827, "航法危機（続き）"),
    (852, "天王星交点面で1436万km誤差"),
    (856, "天王星交点面（続き）"),
    (937, "修正可能な時間窓 — 約10分"),
    (968, "慣性航法系コースを選択"),
    (993, "天王星磁気圏突入 — 高度25RU"),
    (997, "天王星磁気圏（続き）"),
]

# Key timestamps for EP04 — Titania → Earth (65% thrust, plasmoid)
EP04_KEYFRAMES = [
    # (timestamp_seconds, description)
    (7, "2次冷却系圧力0.74MPa — 規定値の63%"),
    (22, "タイタニアまで残り9時間42分"),
    (33, "軌道投入に減速噴射必要"),
    (77, "磁気ノズルコイル温度異常"),
    (120, "プラズモイド発生検知 — 数分後に交差"),
    (158, "磁気シールド残寿命14分 — 通過8分"),
    (165, "天王星磁軸傾斜60° — プラズモイド予測困難"),
    (392, "累積被曝量48ミリシーベルト"),
    (617, "480ミリシーベルト — ゲスト読み取り"),
    (791, "深宇宙スキャナー — 土星方面から複数大型船舶"),
    (797, "公安艦隊5隻 — 到着まで33時間"),
    (985, "フルチェックリスト — 冷却系・シールド・点火回数"),
    (1049, "出力65% — 推力6.3MN — 巡航加速"),
    (1104, "炉アームド — カウントダウン"),
]

# Key timestamps for EP05 — Uranus → Earth (507h composite route)
EP05_KEYFRAMES = [
    # (timestamp_seconds, description)
    (2, "骨格フレーム亀裂報告 — フレーム5番0.3μm、フレーム7番0.2μm"),
    (86, "航路ブリーフィング — タイタニア→地球直接エントリー"),
    (142, "自律航法説明 — 目的地：地球高度400km低軌道"),
    (156, "推定所要時間507時間"),
    (183, "土星リング近傍5km校正 + 木星フライバイ説明"),
    (202, "予定速度1500km/s — オーベルト効果3%向上"),
    (215, "点火計画4回 — 土星通過時誤差最大1000km"),
    (249, "第1シークエンス完了 — 予定ΔV達成・天王星脱出軌道"),
    (313, "オービタルカーテン通過 — 土星港湾交差圏内侵入"),
    (554, "土星リング面スポーク帯域接近 — 現在距離88km"),
    (596, "現在速度1500km/s — 1cm氷粒衝突110MJ"),
    (671, "木星パワードフライバイ — エントリー速度1500km/s"),
    (718, "最終速度2100km/s — 核魚雷実効殺傷半径40km"),
    (776, "ノズル寿命残り55時間38分 vs 必要燃焼55時間12分 マージン26分"),
    (871, "保安艇2隻待ち伏せ確認 — 航法表示"),
    (908, "ΔV残り400km/s — イオ・トーラス外沿・外部線量220Sv/h"),
    (959, "小惑星帯通過 — 航法誤差20km以内"),
    (1026, "減速開始 — 目標速度1500km/s"),
    (1236, "主機アームド — カウントダウン 5,4,3,2,1"),
    (1348, "残りΔV 20km/s — ノズル耐久限界まで20秒"),
    (1356, "残りΔV 10→7.67km/s — 第一宇宙速度到達カットオフ"),
    (1370, "軌道速度達成 — 地球低軌道400km投入完了"),
    (1378, "磁気ノズル消失 — 温度センサーロスト"),
]


def extract_frame(video_path: str, timestamp_sec: float,
                  output_path: str) -> bool:
    """Extract a single frame from video at the given timestamp."""
    cmd = [
        "ffmpeg", "-ss", str(timestamp_sec),
        "-i", video_path,
        "-frames:v", "1",
        "-q:v", "2",  # High quality JPEG
        "-y",  # Overwrite
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0


def extract_frame_range(video_path: str, center_sec: float,
                        output_dir: str, prefix: str,
                        delta_sec: float = 1.0, count: int = 3) -> list[str]:
    """Extract multiple frames around a timestamp to catch the best one."""
    frames = []
    for i in range(count):
        offset = (i - count // 2) * delta_sec
        ts = center_sec + offset
        if ts < 0:
            continue
        fname = f"{prefix}_{ts:.0f}s.jpg"
        outpath = str(Path(output_dir) / fname)
        if extract_frame(video_path, ts, outpath):
            frames.append(outpath)
    return frames


def main():
    parser = argparse.ArgumentParser(
        description="Extract key frames from SOLAR LINE episodes"
    )
    parser.add_argument("video", help="Path to video file")
    parser.add_argument("--episode", type=int, required=True)
    parser.add_argument("--out-dir", default=None,
                        help="Output directory for frames")
    parser.add_argument("--range", type=float, default=0,
                        help="Extract range of frames around each keyframe (±seconds)")
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.exists():
        print(f"Error: Video not found: {video_path}", file=sys.stderr)
        sys.exit(1)

    ep_str = f"ep{args.episode:02d}"
    out_dir = args.out_dir or f"raw_data/frames/{ep_str}"
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    # Select keyframes for episode
    episode_keyframes = {
        1: EP01_KEYFRAMES,
        2: EP02_KEYFRAMES,
        3: EP03_KEYFRAMES,
        4: EP04_KEYFRAMES,
        5: EP05_KEYFRAMES,
    }
    if args.episode in episode_keyframes:
        keyframes = episode_keyframes[args.episode]
    else:
        print(f"No predefined keyframes for EP{args.episode:02d}. "
              "Use --timestamps to specify.")
        sys.exit(1)

    print(f"=== Frame Extraction: Episode {args.episode} ===")
    print(f"Video: {video_path}")
    print(f"Output: {out_dir}")
    print(f"Keyframes: {len(keyframes)}")
    print()

    extracted = []
    for i, (ts, desc) in enumerate(keyframes):
        prefix = f"frame_{i:03d}"
        fname = f"{prefix}_{ts}s.jpg"
        outpath = str(Path(out_dir) / fname)

        mins = ts // 60
        secs = ts % 60
        print(f"  [{i+1}/{len(keyframes)}] {mins:02d}:{secs:02d} — {desc}")

        if args.range > 0:
            frames = extract_frame_range(
                str(video_path), ts, out_dir, prefix,
                delta_sec=args.range, count=3
            )
            extracted.extend(frames)
        else:
            if extract_frame(str(video_path), ts, outpath):
                extracted.append(outpath)
            else:
                print(f"    FAILED to extract frame")

    print(f"\nExtracted {len(extracted)} frames to {out_dir}")

    # Save metadata
    metadata = {
        "episode": args.episode,
        "videoFile": str(video_path.name),
        "framesDir": out_dir,
        "keyframes": [
            {
                "index": i,
                "timestampSec": ts,
                "description": desc,
                "filename": f"frame_{i:03d}_{ts}s.jpg",
            }
            for i, (ts, desc) in enumerate(keyframes)
        ],
    }

    meta_path = Path(out_dir) / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"Metadata saved to: {meta_path}")


if __name__ == "__main__":
    main()
