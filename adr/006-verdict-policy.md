# ADR-006: 判定（Verdict）ポリシー

## Status

Accepted

## Context

各軌道遷移の分析結果に判定を付与する。初期は5段階（plausible, conditional, reference, indeterminate, implausible）だったが、「判定不能」の乱用が懸念された。

## Decision

**参考計算（reference）に「判定不能」は使用しない。**「判定不能」は、作中の描写と直接比較可能な値に対してのみ使用する。参考計算は作中に比較対象がないため、判定の対象外とする。

## Alternatives Considered

- **5段階維持（indeterminate 含む）**: 全遷移に判定を付与する一貫性はあるが、参考計算に「判定不能」が多発して情報価値が低下。
- **判定なし**: 数値のみ提示してジャッジしない。読者が独自に判断できるが、考察としての付加価値が低下。

## Assumptions

- 読者は「参考計算」と「作中描写の検証」の区別を理解できる
- 作中で明示されていない数値（遷移時間が台詞で言及されない等）は参考計算として扱う

## Consequences

- 判定の基準が明確化され、読者にとって意味のある評価のみが提示される
- 参考計算は「こういう値になる」という情報提供に徹する
- 実質的に使用される判定は：plausible（妥当）、conditional（条件付き妥当）、reference（参考）、implausible（非現実的）の4種
