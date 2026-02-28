/**
 * Cross-Episode Consistency Analysis
 *
 * Compares parameters, assumptions, and findings across all 5 episodes
 * to identify consistency patterns and discrepancies.
 *
 * Human directive: エピソード間の整合性も考察したい
 */

import type { SummaryReport, ComparisonTable, ComparisonRow, OrbitalDiagram } from "./report-types.ts";
import { computeTimeline, type TimelineEvent } from "./timeline-analysis.ts";
import { calendarToJD, jdToDateString, planetPosition } from "./ephemeris.ts";

/** Ship specifications from worldbuilding + episode depictions */
export const SHIP_SPECS = {
  name: "ケストレル号",
  nominalMassT: 48_000,
  thrustMN: 9.8,
  emergencyThrustMN: 10.7,
  damagedThrustPercent: 65,
  damagedThrustMN: 6.37,
  engine: "TSF-43R Orion Micropulser",
  fuel: "D-He³",
  lengthM: 42.8,
};

/** Per-episode route and key findings */
export interface EpisodeSummary {
  episode: number;
  route: string;
  transferTime: string;
  brachistochroneDeltaV: number | null; // km/s
  massBoundaryT: number | null;
  thrustUsedMN: number;
  verdict: string;
  departureBody: string;
  arrivalBody: string;
}

export const EPISODE_SUMMARIES: EpisodeSummary[] = [
  {
    episode: 1,
    route: "火星 → ガニメデ（木星）",
    transferTime: "72時間",
    brachistochroneDeltaV: 8497.39,
    massBoundaryT: 299,
    thrustUsedMN: 9.8,
    verdict: "条件付き（質量 ≤299t で成立）",
    departureBody: "火星",
    arrivalBody: "ガニメデ（木星系）",
  },
  {
    episode: 2,
    route: "木星圏脱出 → 土星/エンケラドス",
    transferTime: "約87日（トリム推力3日+巡航）",
    brachistochroneDeltaV: null, // not brachistochrone — ballistic
    massBoundaryT: null,
    thrustUsedMN: 0, // damaged, trim only
    verdict: "妥当（太陽系双曲線軌道）",
    departureBody: "木星圏（50 RJ）",
    arrivalBody: "エンケラドス（土星系）",
  },
  {
    episode: 3,
    route: "エンケラドス（土星）→ タイタニア（天王星）",
    transferTime: "143時間12分",
    brachistochroneDeltaV: 11165,
    massBoundaryT: 452,
    thrustUsedMN: 9.8,
    verdict: "条件付き（質量 ≤452t で成立）",
    departureBody: "エンケラドス（土星系）",
    arrivalBody: "タイタニア（天王星系）",
  },
  {
    episode: 4,
    route: "タイタニア（天王星）→ 地球（出発）",
    transferTime: "8.3日（300t想定）〜105日（48,000t想定）",
    brachistochroneDeltaV: 1202, // at 48,000t, 65% thrust
    massBoundaryT: null, // wide range feasible
    thrustUsedMN: 6.37,
    verdict: "条件付き（幅広い質量で成立）",
    departureBody: "タイタニア（天王星系）",
    arrivalBody: "地球",
  },
  {
    episode: 5,
    route: "天王星→地球（到着・捕捉）",
    transferTime: "8.3日（300t）〜105日（48,000t）※暫定",
    brachistochroneDeltaV: 15207, // at 300t, 65% thrust
    massBoundaryT: null, // analysis pending subtitle data
    thrustUsedMN: 6.37,
    verdict: "暫定: 条件付き（捕捉ΔV 0.42〜3.18 km/s）",
    departureBody: "タイタニア（天王星系）",
    arrivalBody: "地球",
  },
];

/** Build the ship specifications comparison table */
export function buildShipSpecsTable(): ComparisonTable {
  return {
    caption: "船仕様の使用状況",
    episodes: [1, 2, 3, 4, 5],
    rows: [
      {
        metric: "推力 (MN)",
        values: { 1: "9.8", 2: "≈0（トリムのみ）", 3: "9.8", 4: "6.37（65%）", 5: "6.37（65%）※暫定" },
        status: "ok",
        note: "損傷状態を反映、一貫性あり",
      },
      {
        metric: "公称質量 (t)",
        values: { 1: "48,000", 2: "48,000", 3: "48,000", 4: "48,000", 5: "48,000" },
        status: "warn",
        note: "全話で同一値だが物理的に非整合",
      },
      {
        metric: "質量境界値 (t)",
        values: { 1: "≤299", 2: "—", 3: "≤452", 4: "≤3,929（30日）", 5: "※暫定" },
        status: "ok",
        note: "数百t程度が真の質量と推定",
      },
      {
        metric: "エンジン状態",
        values: { 1: "正常", 2: "損傷（連続点火不可）", 3: "修復済", 4: "損傷（65%出力）", 5: "損傷（65%出力）※暫定" },
        status: "ok",
        note: "物語の進行に整合",
      },
    ],
  };
}

/** Build the route continuity comparison table */
export function buildRouteContinuityTable(): ComparisonTable {
  return {
    caption: "航路の連続性",
    episodes: [1, 2, 3, 4, 5],
    rows: [
      {
        metric: "出発地",
        values: { 1: "火星", 2: "木星圏（50 RJ）", 3: "エンケラドス", 4: "タイタニア", 5: "（天王星→地球遷移中）" },
        status: "ok",
        note: "各話の到着地が次話の出発地に対応",
      },
      {
        metric: "到着地",
        values: { 1: "ガニメデ（木星系）", 2: "エンケラドス（土星系）", 3: "タイタニア（天王星系）", 4: "地球（出発）", 5: "地球（到着）" },
        status: "ok",
        note: "太陽系外側→内側への帰路が完結",
      },
      {
        metric: "遷移時間",
        values: { 1: "72h", 2: "≈87日", 3: "143h 12m", 4: "8.3〜105日", 5: "※暫定（ep04継続）" },
        status: "ok",
        note: "Brachistochrone前提で現実的",
      },
      {
        metric: "判定",
        values: { 1: "条件付き", 2: "妥当", 3: "条件付き", 4: "条件付き", 5: "暫定: 条件付き" },
        status: "ok",
        note: "全話で物理的に成立可能",
      },
    ],
  };
}

/** Build the scientific accuracy highlights table */
export function buildAccuracyTable(): ComparisonTable {
  return {
    caption: "科学的精度のハイライト",
    episodes: [1, 2, 3, 4, 5],
    rows: [
      {
        metric: "実データとの整合",
        values: {
          1: "—",
          2: "木星脱出速度8.42 km/s",
          3: "航法精度99.8%",
          4: "天王星磁場傾斜99.5%",
          5: "※字幕待ち",
        },
        status: "ok",
        note: "Voyager 2データ等との高精度一致",
      },
      {
        metric: "物理限界の尊重",
        values: {
          1: "ΔV 8,497 km/s",
          2: "太陽脱出速度ギリギリ",
          3: "ΔV 11,165 km/s",
          4: "被曝量480 mSv<ICRP上限",
          5: "点火回数3回で成否※暫定",
        },
        status: "ok",
        note: "実在の物理定数・安全基準を参照",
      },
    ],
  };
}

/** Build the ΔV scaling analysis table */
export function buildDeltaVScalingTable(): ComparisonTable {
  return {
    caption: "Brachistochrone ΔV スケーリング",
    episodes: [1, 2, 3, 4, 5],
    rows: [
      {
        metric: "距離 (AU)",
        values: { 1: "3.68", 2: "4.38（弾道）", 3: "9.62", 4: "18.2", 5: "18.2（ep04継続）" },
        status: "ok",
        note: "太陽系外側へ距離増大→帰還",
      },
      {
        metric: "Brachistochrone ΔV (km/s)",
        values: { 1: "8,497", 2: "—（弾道）", 3: "11,165", 4: "1,202（48kt）", 5: "15,207（300t）※暫定" },
        status: "ok",
        note: "距離と時間に対して整合的にスケーリング",
      },
      {
        metric: "必要加速度 (g)",
        values: { 1: "3.34", 2: "—", 3: "2.21", 4: "0.014（48kt）", 5: "2.17（300t）※暫定" },
        status: "ok",
        note: "遷移時間が長いほど加速度は低い",
      },
      {
        metric: "ホーマン基準 (年)",
        values: { 1: "3.1", 2: "10", 3: "27.3", 4: "16.1", 5: "16.1（ep04と同区間）" },
        status: "ok",
        note: "Brachistochroneとの比較で劇的短縮",
      },
    ],
  };
}

/** Build the planetary positions and timeline table */
export function buildTimelineTable(): ComparisonTable {
  // Use 2240 as a representative epoch for the SF timeline
  const timeline = computeTimeline(calendarToJD(2240, 1, 1));

  const rows: ComparisonRow[] = timeline.events.map((event) => ({
    metric: `EP${event.episode}: ${event.description.split("→")[0].trim()} → ${event.description.split("→").slice(-1)[0].trim()}`,
    values: {
      1: event.episode === 1 ? `${event.departureDate} → ${event.arrivalDate}` : "—",
      2: event.episode === 2 ? `${event.departureDate} → ${event.arrivalDate}` : "—",
      3: event.episode === 3 ? `${event.departureDate} → ${event.arrivalDate}` : "—",
      4: event.episode === 4 ? `${event.departureDate} → ${event.arrivalDate}` : "—",
      5: "—",
    },
    status: "ok" as const,
    note: event.notes,
  }));

  return {
    caption: "推定タイムライン（惑星位置に基づく）",
    episodes: [1, 2, 3, 4, 5],
    rows,
  };
}

/** Generate timeline Markdown section content */
export function buildTimelineMarkdown(): string {
  const timeline = computeTimeline(calendarToJD(2240, 1, 1));

  const AU_KM = 149_597_870.7;
  const DEG = 180 / Math.PI;

  const eventLines = timeline.events.map((event) => {
    const phaseDeg = (event.phaseAngleAtDeparture * DEG).toFixed(1);
    return `- **第${event.episode}話**: ${event.departureDate} 出発 → ${event.arrivalDate} 到着（${event.durationHours < 200 ? event.durationHours + "時間" : (event.durationHours / 24).toFixed(0) + "日"}）\n  - 出発時位相角: ${phaseDeg}° / ${event.notes}`;
  });

  return `これまでの分析では、各軌道遷移のΔV計算のみを行い、目的天体が到着時にその位置に実際に存在するかを検証していなかった。ここでは、JPLの平均軌道要素から惑星の黄経を計算し、各遷移が成立する惑星配置と太陽系日時を推定する。

**前提**: 作品の時代設定は未特定だが、惑星配置の周期性から複数のエポックで計算可能。ここでは2240年代を代表例として使用する。

### 推定タイムライン（検索開始: ${timeline.searchEpoch}）

${eventLines.join("\n")}

**全行程: ${timeline.totalDurationDays.toFixed(0)}日間** — 第2話のトリム推力遷移（約87日）が旅程の大部分を占める。純粋な弾道軌道では約997日かかるところ、3日間のトリム推力により約87日に短縮された。

### 惑星配置の整合性

各遷移について、出発時と到着時の惑星位置を計算した結果:

1. **EP01 (火星→木星)**: 火星-木星最接近付近で出発。Brachistochrone遷移では位相角の制約は緩いが、距離が近いほどΔVが小さくなるため、最接近付近が最適。
2. **EP02 (木星→土星)**: 木星脱出後のトリム推力遷移では、3日間の推力（ΔV ≈ 85 km/s）を加えることで、純粋弾道の約997日から約87日に大幅短縮。土星が約87日後に到着位置に存在する惑星配置が必要であり、木星-土星間の位相角が重要。
3. **EP03 (土星→天王星)**: 143時間のBrachistochrone遷移。土星-天王星間距離は惑星配置によって9.6〜28.5 AUの範囲で変動する。
4. **EP04-05 (天王星→地球)**: 約18.2 AUの帰還航路。天王星は公転周期84年のため、数日〜数か月の遷移時間中にほとんど移動しない。

${timeline.consistencyNotes.length > 0 ? "\n### 注記\n\n" + timeline.consistencyNotes.map((n) => `- ${n}`).join("\n") : ""}`;
}

/** Generate the complete cross-episode consistency report */
export function generateCrossEpisodeReport(): SummaryReport {
  return {
    slug: "cross-episode",
    title: "クロスエピソード整合性分析",
    summary: "SOLAR LINE 全5話を通じた軌道力学パラメータの整合性を分析する。船の仕様、航路の連続性、質量問題、科学的精度を横断的に検証する。※第5話は暫定分析（字幕データ未取得）。",
    sections: [
      {
        heading: "船仕様の一貫性",
        markdown: `ケストレル号の仕様は全5話を通じて一貫している。推力9.8 MN、D-He³核融合パルスドライブ（TSF-43Rオリオンマイクロパルサー）という基本仕様は変わらず、第2話での損傷（連続点火不可）と第3話での修復、第4話での再損傷（65%出力=6.37 MN）という状態変化も物語の進行と整合する。

**公称質量48,000tの謎** は全話を貫く最大の不整合点である。しかし、これは「非整合」というよりも作品の核心的なミステリーの一つと解釈できる。`,
        table: buildShipSpecsTable(),
      },
      {
        heading: "質量境界値の整合性",
        markdown: `各話のBrachistochrone分析から導出される質量上限は以下の通り:

- **第1話** (72h, 3.68 AU): ≤299 t @ 9.8 MN
- **第3話** (143h12m, 9.62 AU): ≤452 t @ 9.8 MN

第3話の方が距離は2.6倍だが遷移時間も約2倍あるため、質量上限は299tより大きくなる。これは物理的に整合しており、「船の真の質量は数百t程度」という仮説を補強する。

42.8mの貨物船として数百tは現実的な値であり、48,000tの公称値は積載貨物込みの最大値か、あるいは作中で意図的に設定された謎（ケストレル号は見かけよりはるかに軽い）と考えられる。

第4話では65%出力（6.37 MN）でも広い質量範囲で帰還が可能であり、300tなら8.3日、3,929tでも30日で地球到達可能という結果は、上記の質量仮説と矛盾しない。`,
      },
      {
        heading: "航路の連続性",
        markdown: `全5話の航路は太陽系内の連続した旅程を構成する:

**火星 → ガニメデ → (木星脱出) → エンケラドス → タイタニア → 地球**

各話の到着地点が次話の出発地点と一致しており、航路の連続性は完全に保たれている。特に注目すべきは:

- 第1話〜第3話: 太陽系外側へ向かう往路（火星→木星→土星→天王星）
- 第4話: 帰還出発（天王星→地球）= 「新しいソーラーライン」の開拓
- 第5話: 帰還完結（地球到着・捕捉）= ソーラーライン完結

第2話のトリム推力遷移（約87日）のみがBrachistochroneではなく、損傷状態での制限的な軌道遷移である点も物語と整合する。純粋弾道では約997日を要するが、3日間のトリム推力（ΔV ≈ 85 km/s）で約87日に短縮。全航路の合計距離は約35.9 AU。`,
        table: buildRouteContinuityTable(),
      },
      {
        heading: "惑星配置と太陽系タイムライン",
        markdown: buildTimelineMarkdown(),
        table: buildTimelineTable(),
      },
      {
        heading: "Brachistochrone ΔV スケーリング",
        markdown: `Brachistochrone遷移のΔVは距離と遷移時間の関数として \`ΔV = 2 * distance / time\` でスケーリングする。各話の値がこの関係に整合しているかを検証する。

第1話（72h, 3.68 AU）と第3話（143h, 9.62 AU）を比較すると:
- 距離比: 9.62/3.68 = **2.61倍**
- 時間比: 143/72 = **1.99倍**
- ΔV比: 11,165/8,497 = **1.31倍**

理論上のΔV比 = 距離比/時間比 = 2.61/1.99 = **1.31倍** — 計算値と完全に一致する。

第4話は損傷状態かつ遷移時間が大幅に長い（105日@48,000t）ため、ΔVは比較的小さい1,202 km/sとなる。これは距離18.2 AUに対して時間に余裕があることを反映しており、物理的に正しい。`,
        table: buildDeltaVScalingTable(),
      },
      {
        heading: "科学的精度の検証",
        markdown: `作品に登場する科学的数値は、実在の観測データと驚くべき精度で一致する:

**天王星磁場傾斜角** (第4話)
- 作中値: 60°
- Voyager 2実測値: 59.7°
- 精度: **99.5%**

**航法誤差の伝播** (第3話)
- 14.72 AUで1.23°の角度誤差 → 作中「14,360,000 km」の位置誤差
- 計算値: 14,393,613 km
- 精度: **99.8%**

**放射線被曝** (第4話)
- 実曝露量: 480 mSv
- ICRP緊急時上限: 500 mSv
- NASA生涯上限: 600 mSv
- 医学的に現実的な値を使用

**木星脱出速度** (第2話)
- 50 RJでの脱出速度: 8.42 km/s
- 船の速度: 10.3 km/s → 超過分5.93 km/sが双曲線超過速度
- 太陽系脱出速度との余裕: わずか0.53 km/s — 劇的に「ギリギリ」な設定`,
        table: buildAccuracyTable(),
      },
      {
        heading: "総合評価",
        markdown: `SOLAR LINE 全5話を通じた軌道力学描写は、**内部的に高い整合性** を持つ。

※第5話は暫定分析（字幕データ未取得）。第4話からの継続パラメータに基づく予測分析であり、字幕取得後に更新予定。

**整合している点:**
- 船の推力仕様（9.8 MN基準）が全話で一貫
- 航路の連続性が完全（火星→ガニメデ→木星脱出→エンケラドス→タイタニア→地球）
- Brachistochrone ΔVのスケーリングが物理法則に従う
- 損傷・修復の状態遷移が物語と一致
- 実在の科学データ（Voyager 2、ICRP基準）との高精度一致
- 第5話の地球捕捉分析: 月軌道での捕捉ΔV 0.42 km/sは残り点火回数で十分達成可能

**唯一の系統的不整合:**
- 公称質量48,000tでは全てのBrachistochrone遷移が桁違いに不可能
- 真の質量は **300〜500t** 程度と推定（第1話: ≤299t, 第3話: ≤452t）
- この不整合自体が作品の意図的な設定である可能性あり

**第5話で注目すべき物理的ドラマ:**
- 残り点火回数2-3回で brachistochrone(2回) + 捕捉(1回) = ギリギリ3回
- 放射線被曝480 mSv（ICRP上限500 mSvまで残り20 mSv）
- 第2話の脱出速度マージン0.53 km/s、第4話のシールドマージン6分と同様の「ギリギリ」設計

結論: 質量の謎を除けば、SOLAR LINE は **宇宙力学的にきわめて丁寧に設計されたSF作品** である。全5話で太陽系を約35.9 AU横断する壮大な航路が、一貫した物理法則の下で描かれている。`,
      },
    ].map(s => ({ ...s, reproductionCommand: "npm run recalculate" })),
  };
}
