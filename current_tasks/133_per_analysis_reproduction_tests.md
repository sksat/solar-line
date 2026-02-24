# Task 133: 各解析ごとの再現コマンド（解析テスト）

## Status: DONE

## Human Directive
「再現コマンドは、レポートに対してひとつではなく、各解析に対してひとつ作っておく。それをテストのように扱うことで、TDD的に解析を行うことができる。また、自動テストのように、常に解析されている状態を維持する。それによって、前提条件が変わった際にDAGを確認するよりも確実に再度解析を行うことができる。」

## Scope
1. Audit existing analyses (EP01-05 transfers, parameter explorations) for reproduction commands
2. Design per-analysis reproduction command format (CLI invocation that re-derives specific analysis results)
3. Implement individual reproduction scripts for each transfer analysis:
   - EP01: Mars→Ganymede 72h brachistochrone, mass boundary, Hohmann reference, Jupiter arrival
   - EP02: Jupiter escape, ballistic coast, Saturn capture, Enceladus descent
   - EP03: Enceladus departure, Saturn→Uranus transfer, Titania approach, navigation accuracy
   - EP04: Titania departure, thrust-limited transfer, plasmoid encounter, Earth approach
   - EP05: Uranus departure, Jupiter flyby, composite route, LEO insertion, nozzle analysis
4. Register these as automated tests (`npm run test:analyses` or similar)
5. Integrate with CI so analyses are always verified
6. Update `npm run recalculate` to use the per-analysis commands

## Design Notes
- Each analysis test should:
  - Run the calculation script/WASM function
  - Compare output against expected values (with tolerance)
  - Fail clearly when preconditions change (mass, Isp, orbital parameters)
- Think of them as "golden file" tests for analysis results
- When a test fails due to changed preconditions, the analysis must be re-examined (not just the test updated)
- This is more reliable than DAG invalidation because it catches actual numerical discrepancies

## Dependencies
- solar-line-core (Rust orbital mechanics)
- solar-line-wasm (WASM bridge)
- Existing calculation scripts in ts/
- reports/data/calculations/ (current calculation outputs)
