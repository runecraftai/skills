---
name: feature-parity
description: >
  Scores how much of a target product a rebuild or clone already reproduces, from a features.csv ledger
  of must, should, and nice features, and gates the result on must-haves with an exit code. Use when
  measuring feature parity against a reference product, deciding whether a rebuild is shippable, gating
  a release on must-have features, or when the user mentions parity, feature coverage, must-have gaps,
  or a features.csv ledger. Do NOT use for visual or pixel comparison, UI snapshot diffs, code-quality
  review, test coverage metrics, or designing how a new feature should work.
license: CC-BY-4.0
requires: bun
artifact-owner: none
script-tests: '{"scripts/feature-parity.ts": "--self-test"}'
metadata:
  version: 1.0.0
---

# feature-parity

> Turns a feature ledger into a score and a gate. The script decides; the ledger's authors decide what counts as a must-have.

## Overview

A rebuild is tracked as one row per feature of the target product. The script reads that ledger, reports how much is reproduced, and exits `1` whenever a `must` feature is not `yes`. The exit code is the gate; the printed "not shippable" line is informational only.

## When to Use

- A team is rebuilding or cloning a product and needs an honest answer to "what is still missing?"
- A release must be blocked until every must-have feature is reproduced.
- A ledger already exists and needs re-scoring after work lands.

## Ledger format

`features.csv` at the path you pass (default `./features.csv`), header required:

```
id,feature,priority,status,evidence,notes
```

| Column | Values |
|---|---|
| `id` | Stable identifier, unique per row |
| `feature` | Name of the target product's feature |
| `priority` | `must`, `should`, or `nice` |
| `status` | `yes`, `partial`, `no`, or `skip` |
| `evidence` | Test, capture, or doc that proves a `yes` |
| `notes` | Free text. **Required** when `status=skip` |

Any other `priority` or `status` value is an error (exit 2). It is never treated as a lower priority.

## Workflow

1. Build the ledger from the target product's feature list. Ask the user to confirm each `must` row; do not assign `must` yourself.
2. Mark `yes` only when `evidence` points at something you ran or observed. The script does not check evidence; the reviewer does.
3. Mark a feature `skip` only when it is outside the rebuild target, and say why in `notes`. A `skip` is listed and not scored. It does not waive a `must`: a must-have that is not `yes` still fails the gate.
4. Run the evaluator from this skill's root:

   ```bash
   bun scripts/feature-parity.ts features.csv            # Markdown, for a PR comment
   bun scripts/feature-parity.ts features.csv --format json   # for a gate
   ```

   Example input `features.csv`:

   ```
   id,feature,priority,status,evidence,notes
   login,Email login,must,yes,tests/login.spec.ts,
   export-csv,CSV export,must,no,,
   sso,SAML SSO,nice,skip,,Enterprise tier; not in the rebuild target
   ```

   Command and result (exit `1`):

   ```
   ## Feature parity: not shippable (exit 1)

   Reproduced 1 of 2 scored features (50%).

   | Priority | Scored | Yes |
   | --- | --- | --- |
   | must | 2 | 1 |
   | should | 0 | 0 |
   | nice | 0 | 0 |

   ### Missing must-haves

   - `export-csv` CSV export (no)

   ### Not scored (skip)

   - `sso` SAML SSO: Enterprise tier; not in the rebuild target
   ```

5. Act on the exit code, not on the wording:

| Exit | Meaning | Action |
|---|---|---|
| `0` | Every `must` is `yes` | Shippable on the must-have bar |
| `1` | At least one `must` is not `yes` | Not shippable; list the missing must-haves |
| `2` | Invalid ledger or bad usage | Fix the ledger; no score is produced |

## Scoring

- Scored rows are every row whose status is not `skip`.
- Coverage is `yes` divided by scored rows. `partial` counts as not reproduced.
- Coverage is also reported per priority, so a high overall number cannot hide a missing must-have.

## Common Rationalizations

- "The rest is nearly done, so the missing must can be a `nice`." Changing priority to pass the gate defeats the gate. Only the owner of the target's must-have list may change a priority.
- "Mark it `yes`, we will add evidence later." A `yes` without evidence is a claim, not a score.
- "Skip the odd row so the number looks better." A skip must carry a real reason, and skipped must-haves still block.

## Red Flags

- A `must` row marked `yes` with an empty `evidence` column.
- A `skip` row with a vague reason such as "later" or "n/a".
- Exit `2` being read as "partly passing". It means the ledger was rejected.
- Reporting a coverage percentage without the exit code.

## Verification

- `bun scripts/feature-parity.ts --help` exits `0`.
- Re-run the evaluator on the ledger after each change and confirm the exit code, not the summary line.
