# Task 395: Fix G-force Terminology Conflation in Reports

## Status: **DONE**

## Summary

CLAUDE.md requires strict separation of 居住G (habitation G) from 推進G (propulsion G). Audit found 3 clear violations where propulsion G is evaluated as a crew endurance constraint without noting the SF convention:

1. EP01 line 928: "搭乗者は2gの加速に耐える必要がある" — propulsion G as crew constraint
2. EP01 line 942: "3.3gの持続加速は搭乗者にとって過酷" — propulsion G labeled grueling
3. EP05 line 1167: "乗員への負担も現実的" — propulsion G on crew-burden scale

## Rationale
- CLAUDE.md policy: G-force category separation is mandatory
- EP04 already handles this correctly ("推進Gと居住Gは異なるカテゴリ") — follow that pattern
- Fixes should note that propulsion G is handled by SF convention, not evaluate crew endurance
