# Task 142: Landing Page Enhancement + EP05 Uranus-Centric Diagram

## Status: DONE

## Motivation
1. **Landing page is too thin**: The index page has only a 2-sentence project description. New visitors have no context for what SOLAR LINE is, where to watch it, what the analysis covers, or how to interpret verdicts. The stats grid and episode cards are good but lack framing.

2. **EP05 missing Uranus-system diagram**: EP02 has a Jupiter-centric escape diagram, EP03 has a Saturn-centric capture diagram, but EP05 has no Uranus-centric departure diagram showing Titania's orbit and the SOI escape geometry. This is an analytical gap.

## Scope

### Landing Page Enhancement
1. Expand the project introduction with:
   - What SOLAR LINE is (SF anime by ゆえぴこ, 全5話)
   - Where to watch (YouTube/Niconico links to Part 1)
   - What kind of analysis this site provides (ΔV, brachistochrone, orbital mechanics — explained accessibly)
   - Brief verdict legend explaining the badge meanings
2. Add a "how to navigate" note for the summary/meta reports
3. Keep it concise — this is a landing page, not an essay

### EP05 Uranus-Centric Diagram
1. Add an orbital diagram showing:
   - Uranus at center
   - Titania orbit
   - Major Uranian moons for reference (Miranda, Ariel, Umbriel, Oberon)
   - Kestrel escape trajectory from Titania
   - SOI boundary
2. Use epoch-consistent planet angles (compute from ephemeris)
3. Add to EP05 report data

## Dependencies
- templates.ts (renderIndex function)
- report-types.ts (SiteManifest for index rendering)
- ep05.json (diagram data)
