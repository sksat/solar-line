# Task 001: Minimal Monorepo Scaffold + CI

## Status: DONE

## Goal
Create the minimal project scaffold with one passing Rust test, one passing TS test, and a CI workflow that runs both.

## Details
- Rust workspace with a `crates/` directory, initial `solar-line-core` crate
- TypeScript project with `package.json`, basic test setup
- GitHub Actions CI: run `cargo test` and TS tests
- `.gitignore` for raw data, build artifacts
- Basic directory structure: `crates/`, `ts/`, `reports/`, `scripts/`

## Acceptance Criteria
- `cargo test` passes with at least one test
- TS test runner passes with at least one test
- CI workflow file exists and would run both
