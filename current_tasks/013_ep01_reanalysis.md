# Task 013: Episode 1 Reanalysis — Evidence & Multi-Parameter Exploration

## Status: IN PROGRESS

## Goal
Address human feedback on Episode 1 analysis:
1. Add proper evidence citations (source URLs, episode timestamps) for all ship parameters
2. Replace single "implausible" verdict with multi-parameter scenario exploration
3. Explore what conditions would make the depicted 72h transfer plausible

## Human Directives
- ケストレルの性能評価の根拠が無い (Kestrel performance evaluation lacks cited evidence)
- 分析は複数パターンを想定して議論すべき (Explore multiple parameter scenarios)

## Scope
1. Add `source` field to ep01.json transfer entries citing worldbuilding doc URL and episode timestamps
2. Expand transfer analyses with multi-parameter scenarios:
   - What mass would make 72h transfer feasible with 9.8 MN thrust?
   - What thrust would be needed at 48,000t for 72h?
   - What about gravity assists (Jupiter slingshot)?
   - Different distance assumptions (opposition vs other alignments)
   - What if "嵐の回廊" provides some astrodynamic shortcut?
3. Update verdicts: instead of flat "implausible", use "conditional" with boundary conditions
4. Add evidence citation infrastructure to report types
5. Update tests

## Depends on
- Task 006 (original Episode 1 analysis)
- Task 012 (report enrichment)

## Notes
- The worldbuilding source is note.com/yuepicos/n/n4da939fc40ed
- Key ambiguity: "約48000 t" — already noted in ideas/ep01_mass_ambiguity.md
- The analysis code already has massSensitivity() but it's not reflected in the report JSON
