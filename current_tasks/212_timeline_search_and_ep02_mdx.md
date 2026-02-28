# Task 212: Timeline Search Optimization and EP02 MDX Update

## Status: IN PROGRESS
## Claimed by: Session (2026-02-28)

## Priority: HIGH

## Objective
Two related improvements:

### A. Timeline Search for Shorter Total Mission
The current ~124-day total mission (dominated by EP02's 87-day transit) may feel inconsistent with EP05 dialogue where きりたん describes 15 days as "long" (15日以上何もないのか). Search for planetary configurations where the total mission is shorter while maintaining all anime-stated transit times.

Key constraints:
- EP01: 72h (fixed)
- EP02: trim-thrust transit — depends on Jupiter-Saturn distance
- EP03: 143h (fixed)
- EP04-05: 507h (fixed)
- 15-day coast must feel subjectively "long" relative to total mission

The EP02 transit time depends on the Jupiter-Saturn angular separation at the time. With trim thrust (1% for 3 days), shorter distances mean shorter transits. Search for epochs where Jupiter and Saturn are closer together.

### B. EP02 Episode MDX 455→87 Day Update
The EP02 episode analysis (ep02.md) still has ~21 references to "455 days" from the old pure-ballistic estimate. These need updating:
- Transfer parameters: `estimatedTransitDays: 455` → `87` (with trim thrust)
- Diagram animation: `durationSeconds: 39312000` → `7516800` (87 days)
- Analysis text: update 455-day references to discuss both pure-ballistic (~997d) and trim-thrust (~87d) scenarios
- Velocity/mass chart x-axis ranges

### C. Animation Consistency Tests
Add tests to verify that orbital diagram animation `durationSeconds` values match the depicted transit durations for all episode diagrams.

## Key Files
- `ts/src/timeline-analysis.ts` (search logic)
- `ts/src/timeline-constraints.test.ts` (constraint tests)
- `reports/data/episodes/ep02.md` (episode report)
- `ts/src/orbital-3d-analysis.ts` (3D analysis dates)

## Human Directive
「主人公は15日の無の区間を長いと感じている描写があるので、全行程が3桁日になるのは違和感が拭えない。これも制約条件として、適切な惑星配置の日時を探すタスクの再試行とそのためのテストを書くべき。」
