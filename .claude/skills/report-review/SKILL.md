---
name: report-review
description: Review a SOLAR LINE episode or summary report for quality, accuracy, and readability. Checks data integrity, Japanese text quality, and orbital mechanics correctness.
argument-hint: [episode number or "summary" or "all" or "final"]
---

# Report Quality Review

Two-stage systematic review for SOLAR LINE reports.

## How to Use

Specify what to review with `$ARGUMENTS`:
- `1` through `5` — draft review of a specific episode report
- `summary` — draft review of all summary pages
- `all` — draft review of everything
- `final` — final review of deployed site (isolated, no codebase access)

## Stage 1: Draft Review (with codebase access)

### Reviewer Persona

**IMPORTANT**: All reviews must be conducted by agents with separate context (Task agents or Codex), NOT the current session. Set this system prompt for the reviewer:

> あなたはSF作品と軌道力学に関心がある読者ですが、どちらにも専門的な知識はありません。
> 「SOLAR LINE」というアニメについて事前知識は一切ありません。
> レポートを初めて読む一般読者として、以下の観点でレビューしてください：
> - 専門用語の説明は十分か？初見の読者が理解できるか？
> - 図表やチャートは分析をサポートしているか？何を示しているか明確か？
> - 分析の論理展開は追えるか？飛躍はないか？
> - 前提知識なしで内容を楽しめるか？
> 率直にフィードバックしてください。

### Implementation

Use a Task agent (Sonnet) for the draft review:

```
Task(subagent_type="general-purpose", model="sonnet", prompt=`
[Insert reviewer persona above as system context]

Review the report at reports/data/episodes/ep0X.md (or summary/*.md).
Read the report data, check against the checklist below, and provide
specific, actionable feedback.
`)
```

For physics-specific review, use Codex (gpt-5.2 reasoning model):

```
/nice-friend Review the physics calculations in EP0X.
Are the orbital mechanics claims well-supported?
Are the ΔV, transfer time, and mass calculations consistent?
```

### Automated Checks (run first)

```bash
cd ts && npm test
```

### Manual Review Checklist

#### 1. Data Integrity
- [ ] All `transferId` references are consistent (transfers ↔ explorations)
- [ ] All `evidenceQuoteIds` reference existing `dialogueQuotes`
- [ ] `computedDeltaV` is not null where a calculation was performed
- [ ] Verdict is appropriate (not "indeterminate" for reference calculations)
- [ ] Source citations have valid URLs (not plain text)

#### 2. Japanese Text Quality
- [ ] All UI text and analysis prose is in Japanese
- [ ] Character names use correct forms: きりたん, ケイ (ケストレルAI)
- [ ] Dialogue quotes match the `きりたん「…」(MM:SS)` format
- [ ] Timestamps are accurate (cross-reference with video)
- [ ] No untranslated English in body text (technical terms in English are OK)
- [ ] Terminology: "brachistochrone" preferred over ブラキストクローネ

#### 3. Orbital Mechanics Accuracy
- [ ] ΔV calculations use correct formulas (vis-viva, brachistochrone)
- [ ] Units are consistent (km, km/s, seconds, AU)
- [ ] Planetary distances match ephemeris data for the given epoch
- [ ] Transfer times are physically plausible for the given ΔV and distance
- [ ] Cross-episode values are consistent (ship mass, Isp, thrust)

#### 4. Report Structure
- [ ] Video cards at the top (YouTube + Niconico)
- [ ] Dialogue citations woven naturally into analysis text
- [ ] Most plausible scenario presented first
- [ ] Implausible scenarios collapsed by default (`<details>`)
- [ ] Explorations nested under parent transfers
- [ ] Orbital diagrams have animation config
- [ ] Scale legend and timeline annotations on complex diagrams

#### 5. Narrative Plausibility
- [ ] Transit durations match the show's pacing
- [ ] Distances/conditions consistent with on-screen depiction
- [ ] Crew experience matches depicted reactions (SF G-tolerance assumed)
- [ ] Cold sleep NOT assumed unless explicitly depicted
- [ ] Ambiguity documented where the show is unclear

## Stage 2: Final Review (deployed site, no codebase)

**Purpose**: Evaluate the reader experience of the deployed site without developer context.

### Implementation

Launch a Task agent in isolation (no file access), using only WebFetch:

```
Task(subagent_type="general-purpose", model="sonnet", prompt=`
[Insert reviewer persona above]

You are reviewing the deployed website at:
https://sksat.github.io/solar-line/

Using WebFetch, visit the following pages and evaluate the reader experience:
1. Top page (index.html) — is the project purpose clear?
2. Episode 1 report — can you follow the analysis as a newcomer?
3. Cross-episode summary — does it provide useful synthesis?
4. Navigation — can you find what you need? Are links working?

Focus on:
- Layout and readability on the rendered page
- Navigation flow between pages
- Broken links or missing content
- Whether the analysis is accessible to the target audience
- Overall impression as a first-time visitor

Report your findings with specific page URLs and quotes.
`)
```

### Final Review Checklist
- [ ] Top page communicates project purpose clearly
- [ ] Episode pages load correctly with all diagrams/charts
- [ ] Navigation dropdown menus work
- [ ] Cross-episode links function
- [ ] KaTeX formulas render properly
- [ ] Tables are readable
- [ ] Orbital diagrams have visible animations
- [ ] Source citation links are clickable
- [ ] GitHub repo link visible in footer
- [ ] Mobile-friendly layout (responsive design)

## Efficiency Notes

- Run automated tests first — they catch most data integrity issues
- Use Sonnet subagents for draft review (separate context required)
- Use gpt-5.2 (reasoning model) for physics consultations via nice-friend
- Focus final review on reader experience, not data accuracy
- Don't fix issues during review — create separate tasks for fixes
- Record review findings in ideas/ for future sessions
