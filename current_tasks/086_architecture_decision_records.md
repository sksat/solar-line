# Task 086: ADR (Architecture Decision Records)

## Status: DONE (Phase 1-2 complete, Phase 3 optional)

## Motivation

Human directive: 「各種意思決定を ADR として残しておくこと。そうすると、どんなポリシーで設計や分析をするのかを見失いにくい。過去の意思決定も session log や commit log から発掘すること」

## Requirements

### Phase 1: ADR Infrastructure
- Create `adr/` directory with template and index
- ADR format: numbered markdown files (e.g., `adr/001-report-language.md`)
- Template: Title, Status, Context, Decision, Consequences
- Index file auto-generated or manually maintained

### Phase 2: Mine Historical ADRs
Key decisions to document (from session/commit history):
- ADR-001: All reports in Japanese (Phase 1 directive)
- ADR-002: Zero external Rust dependencies for WASM compat
- ADR-003: Flat f64 WASM API (Codex-reviewed)
- ADR-004: Two-phase dialogue pipeline (extraction + attribution)
- ADR-005: Custom markdown renderer (no external deps)
- ADR-006: Verdict policy (no "indeterminate" for reference calcs)
- ADR-007: SF tolerance (human g-tolerance acceptable, focus on narrative consistency)
- ADR-008: Brachistochrone over カタカナ terminology
- ADR-009: sqrt scale mode for orbital diagrams
- ADR-010: Sonnet delegation criteria
- ADR-011: Iterative re-analysis with nice-friend perspectives
- ADR-012: JST timestamps for all logs
- ADR-013: CDN-based libraries (KaTeX, highlight.js) over npm dependencies

### Phase 3: Publish on Site
- Add ADR index page to GitHub Pages
- Link from tech overview / footer
- Make ADRs browsable and searchable
