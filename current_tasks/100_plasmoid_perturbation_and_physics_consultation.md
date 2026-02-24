# Task 100: Plasmoid Perturbation Analysis + Physics Consultation Model

## Status: TODO

## Motivation
Human directives:
- プラズモイドなどによる外乱の影響も見積もれるとよい
- 物理学的な考察の相談は -codex のモデルではなく gpt-5.2 のようなモデルに相談した方がよい

## Scope
1. **Plasmoid perturbation**: Estimate the effect of plasmoid encounters on Kestrel's trajectory
   - Model plasmoid as momentum/energy perturbation
   - Calculate trajectory deviation from EP04's plasmoid encounter (480 mSv radiation)
   - Compare perturbation magnitude to course correction ΔV budget
2. **Physics consultation model**: Update nice-friend skill or create new skill to use gpt-5.2 (or latest reasoning model) instead of -codex for physics-specific consultations
   - Keep -codex for design/architecture review
   - Use reasoning model for orbital mechanics, perturbation theory, radiation physics

## Notes
- Plasmoid encounter in EP04 is at Uranus magnetosphere
- Real plasmoid data from Voyager 2 observations available
- Need to distinguish between radiation effect (biological) and momentum effect (trajectory)
