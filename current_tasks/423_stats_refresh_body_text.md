# Task 423: Fix stats-refresh to Update Body Text References

## Status: **DONE**

## Summary

The `stats-refresh.ts` script updates the stats table and bulleted list entries, but misses body text references like `Nのユニットテストで正確性を保証しています`. This causes test failures when Rust test count changes.

## Rationale
- Consistency between stats table and body text is validated by tests (article-content-validation.test.ts:87)
- Manual body text fixes create maintenance burden
- All stat references should be updated atomically
