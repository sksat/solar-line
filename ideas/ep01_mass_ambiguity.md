# Episode 1 Mass Ambiguity Investigation

The worldbuilding document states Kestrel's maximum mass as "約48000 t（標準積載時）".
For a 42.8m ship, 48,000 metric tonnes is extremely dense — roughly comparable to a
medium-sized ocean vessel packed into a much smaller volume.

Possible interpretations:
1. **48,000 t is correct** — the ship is extremely dense (radiation shielding, fusion reactor mass)
2. **48,000 kg (48 t)** — "t" means tonnes but the number is 48, not 48000
3. **4,800 t** — an order-of-magnitude typo
4. **48 t dry + cargo** — the 48000 is actually the dry mass in kg

At 48t (48,000 kg), acceleration would be ~204 m/s² (~20g), making interplanetary
transfers in hours feasible but requiring massive structural g-tolerance.

This merits further investigation:
- Check if later episodes give more clues about ship mass
- Compare with other ships in the setting
- Check if the creator has clarified anywhere

This is significant because the plausibility verdict hinges on mass interpretation.

## Status: RESOLVED

Mass ambiguity extensively analyzed in ship-kestrel.md and cross-episode.md.
Analysis uses 300-500t effective mass range; 48,000t nominal remains a mystery
(cascading to ~67% of DAG nodes via param.ship_mass).
EP01-05 all independently derive mass bounds consistent with 300-500t range.
