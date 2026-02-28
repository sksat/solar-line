# Task 211: G-Force Category Separation (Habitation G vs Propulsion G)

## Status: IN PROGRESS

## Priority: MEDIUM

## Objective
Separate the analysis of two distinct categories of G-force in the reports:
1. **居住区画の体感G（居住G）**: Artificial gravity in habitation sections (e.g., 0.8G environment for outer-garden residents, 1G on Earth). This is a **setting/worldbuilding parameter**.
2. **推進器での加減速によるG（推進G）**: Acceleration/deceleration forces from propulsion. This is a **physics analysis parameter**.

## Background (Human Directive)
「居住区画の体感での G の設定の描写と、推進器での加減速による G は分けて考えた方がよい。特に後者は SF 作品では暗黙の了解としてほぼ無視もしくは軽視される傾向にあるし、かといって厳密に考えると人工重力を発生させるために宇宙船を回転させる必要が生じて見栄えが悪くなりがち。」

### Key Insight
- **Habitation G** (0.8G adaptation, 1G intolerance) is a worldbuilding element about where characters grew up and adapted
- **Propulsion G** (2-3G brachistochrone acceleration) is implicitly ignored in most SF — characters don't experience noticeable effects during acceleration
- These two should NOT be conflated. The fact that きりたん can't handle 1G on Earth doesn't necessarily mean 2-3G propulsion acceleration would be a problem (because SF implicitly handles this differently)
- Strict analysis of propulsion G leads to awkward conclusions (rotating ship for artificial gravity, etc.) that SF works intentionally avoid

## Current State
The ship-kestrel.md 耐G仮説 section currently conflates these:
- Uses きりたんの1G不耐性 (habitation G worldbuilding) as evidence that 慣性補償技術 must exist to handle 推進G
- Concludes "0.8G適応者が2-3Gに平然と耐えられるなら、1Gにも問題ないはず" — but this logic only holds if habitation G and propulsion G are the same phenomenon, which in SF they need not be

## Scope
1. **Update CLAUDE.md** with guidance on separating G categories
2. **Revise ship-kestrel.md 耐G仮説 section** to separate the two G categories
3. **Revise cross-episode.md G負荷の不可視性 section** to note this distinction
4. **Update analysis language** across reports to distinguish 居住G vs 推進G
5. **Note SF convention**: Propulsion G is typically a "don't ask" in SF — the implicit assumption is that it's handled, and strict analysis produces uncinematic results (rotating ships, gel couches, etc.)

## Key Files
- `CLAUDE.md` (G-tolerance sections — multiple)
- `reports/data/summary/ship-kestrel.md` (耐G仮説 section, lines 291-365)
- `reports/data/summary/cross-episode.md` (G負荷の不可視性 section, lines 1986-2000)
- `reports/data/episodes/ep01.md`, `ep04.md`, `ep05.md` (acceleration notes in scenarios)

## Dependencies
- Task 210 (EP03 captive identity) may affect which evidence is used
