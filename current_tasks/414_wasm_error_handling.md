# Task 414: Harden WASM Bindings Error Handling

## Status: **DONE**

## Summary

The WASM binding layer (`solar-line-wasm/src/lib.rs`) has 3 `serde_wasm_bindgen::to_value().unwrap()` calls that would cause WASM panics instead of graceful JsErrors on serialization failure. Additionally, `lorentz_factor()` wraps a core function that uses `assert!()` (panic) for v >= c, with no input validation in the WASM layer.

## Rationale
- CLAUDE.md: "solar-line-wasm is strictly a binding layer (type conversion, error handling)"
- 39 other WASM functions already use `Result<..., JsError>` pattern
- A WASM panic crashes the entire module; a JsError allows JavaScript to handle gracefully
- `lorentz_factor(v >= c)` from JavaScript would crash the WASM module

## Plan
1. Convert 3 `to_value().unwrap()` to `Result<JsValue, JsError>` returns
2. Add input validation to `lorentz_factor` WASM wrapper
3. Add tests for the error paths
