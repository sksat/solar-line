# Task 340: EP02 Jupiter→Saturn 87-Day Transit Duration Review

## Status: DONE

## Description
The 87-day Jupiter→Saturn transit still feels long narratively. The protagonists are NOT in cold sleep during this period. Investigate whether shorter transit scenarios are plausible.

## Source
Human directive (AGENT_PROMPT.md phase 25): "木星 -> 土星への遷移87日はまだ長く感じる。主人公たちはコールドスリープしていない。"

## Findings

### Cold sleep correction
The EP02 report incorrectly implied きりたん was in cold sleep. In reality, only the guest (エスパー) is shown in cold sleep (Scene 6). きりたん appears awake throughout.

### Physical lower bound
Extended two-phase analysis shows **~107 days (3d+3d)** is the minimum capturable transit. Shorter asymmetric splits (5d+3d→57d, 7d+3d→42d) give uncapturable v∞ (>60 km/s).

### Codex consultation
107 days without cold sleep is narratively acceptable in hard SF. "トリムのみ" constrains thrust level, not duration.

## Changes
- Corrected cold sleep attribution in EP02 and cross-episode reports
- Added extended two-phase scenarios (5d+3d through 10d+10d) to ep02-analysis.ts
- Updated narrative pacing discussion, margin gauge, sensitivity summary
- +3 TDD tests, all 2239 pass
