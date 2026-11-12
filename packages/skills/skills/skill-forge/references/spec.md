# SKILL.md Format Specification (Reference)

> Authoritative rules for the open SKILL.md format. Read this when you need precise rules for `name`, `description`, frontmatter fields, or folder layout. When this reference and the bundled validator disagree, the validator wins.

## Directory structure

A skill is a directory containing, at minimum, a `SKILL.md` file:

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

A skill may also include `evals/evals.json` for output-quality evaluation (see [output-evaluation.md](output-evaluation.md)).

## `SKILL.md` format

`SKILL.md` is YAML frontmatter followed by Markdown body.

### Frontmatter fields

| Field | Required | Constraints |
|---|---|---|
| `name` | Yes | 1-64 chars; lowercase letters, numbers, hyphens; no leading/trailing or consecutive hyphens; must match parent directory name. |
| `description` | Yes | 1-1024 chars; non-empty; describes what the skill does and when to use it. |
| `license` | No | License name or reference to bundled license file. |
| `compatibility` | No | 1-500 chars; intended product, system packages, network access, etc. |
| `metadata` | No | Arbitrary key→string mapping. Use unique key names to avoid conflicts. |
| `allowed-tools` | No | Space-separated string of pre-approved tools. Experimental. |
| `requires` | No, warning when absent | Space-separated executable names to locate on PATH, or the literal `none`. |
| `artifact-owner` | No, warning when absent | Exactly `project`, `tool`, or `none`. |
| `script-tests` | No, warning per undeclared script | JSON-encoded map in a YAML string scalar: skill-root-relative script path → behavioral self-test arguments. Standalone validation also accepts a one-level YAML map. |

### `name` rules

- 1-64 characters.
- Lowercase letters (`a-z`), numbers (`0-9`), and hyphens (`-`) only.
- Must not start or end with a hyphen.
- Must not contain consecutive hyphens (`--`).
- Must match the parent directory name.

| Valid | Invalid | Reason |
|---|---|---|
| `pdf-processing` | `PDF-Processing` | Uppercase not allowed |
| `data-analysis` | `-pdf` | Cannot start with hyphen |
| `code-review` | `pdf--processing` | Consecutive hyphens |

### `description` rules

- 1-1024 characters.
- Should describe what the skill does **and** when to use it.
- Include specific keywords that help agents identify relevant tasks.
- No XML angle brackets (`<`, `>`) — they break the YAML.

Good example:

```yaml
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
```

Poor example: `Helps with PDFs.`

### `license` (optional)

Keep it short. A common choice for distributable skills is `CC-BY-4.0`.

### `compatibility` (optional)

Use only if the skill has environment requirements. Examples:

```yaml
compatibility: Designed for Claude Code (or similar products)
compatibility: Requires git, docker, jq, and access to the internet
compatibility: Requires Python 3.11+ and uv
```

Most skills do not need this field.

### `metadata` (optional)

A map from string keys to string values. Common keys for distributable skills:

```yaml
metadata:
  author: your-name-or-org
  version: 1.0.0
```

### `allowed-tools` (optional, experimental)

```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read
```

Support varies across agents.

### Mechanism fields (additive catalog conventions)

These fields extend the catalog's authoring conventions without changing the underlying TLC/open SKILL.md format or its existing checks. They use the dependency-free YAML subset. Keep published catalog additions scalar because its frontmatter reader only supports the pre-existing nested `metadata` block. PyYAML is an optional fallback for syntax outside that subset, never an installed dependency.

```yaml example
requires: python3 git
artifact-owner: project
script-tests: '{"scripts/check.py": "--self-test"}'
```

**`requires`:** Declare executable names, not shell commands, version predicates, paths, package names, or installation instructions. Names contain only letters, digits, `_`, `.`, `+`, or `-`; separate names with whitespace. Use exactly `none` for no executable prerequisites; do not combine it with other names. An empty value, boolean, or mapping is invalid. Presence means `shutil.which` finds an executable on the current PATH; it does not prove version compatibility, service availability, MCP connectivity, or authorization. Keep additional compatibility constraints in `compatibility` and verify those separately. The validator never executes prerequisite probes or installs anything.

**`artifact-owner`:** `project` means artifacts follow the consuming project's existing paths and conventions. `tool` means the skill's named tool owns artifact paths; document those paths in the body. `none` means the skill produces no persistent artifacts (stdout is allowed). The validator checks the declaration, not whether prose or arbitrary code faithfully follows it. Do not invent a competing artifact directory when the project already has one.

Both fields are optional-with-warning during migration: absence is unknown, not an implicit `none`. Invalid declarations are errors immediately. Absence becomes an error only in a later, explicitly versioned catalog policy after existing skills have been migrated; this release has no strict-absence mode and does not retroactively require the fields.

**`script-tests`:** Encode a JSON object in a quoted YAML string scalar, as above, for the catalog. Standalone validation also accepts a one-level YAML mapping with the same keys and values. JSON parse failures or non-object values are errors. Keys are paths under `scripts/`, using forward slashes and no `..` components. Values are non-empty argument strings, split with `shlex.split`, never passed to a shell. For example, `--self-test` should run assertions for both valid and rejected inputs and exit 0 only when all assertions hold. Each declared target must exist. Every regular file recursively under `scripts/` is probed, excluding bytecode and `__pycache__`; keep non-executable test data in `assets/`. An undeclared script runs with `--help` and emits a coverage warning: this is startup smoke coverage, not proof of its gates.

Self-tests must be non-interactive, offline, bounded, and scratch-only. Do not install dependencies, use absolute/parent-relative output paths, modify external files, or launch detached processes. The runner rejects absolute/parent-relative arguments and symlink-containing skills. It copies the skill per script, sets cwd to the copy and HOME/temp variables to scratch, supplies a minimal environment, closes stdin, and captures combined output (up to 4096 bytes in the report). Default timeout: 10 seconds per script; `--script-timeout` accepts a finite number greater than 0 and at most 30. Nonzero exit, launch failure, or timeout is an error. POSIX process groups are killed on timeout, including descendants; a script that exits normally is reaped first, so its process group is never signalled (avoiding recycling of the freed group id). On non-POSIX systems only the direct process is killed; self-tests must not spawn children there.

Runners: `.py` uses the current Python interpreter with bytecode disabled; `.sh` uses available Bash; `.js`/`.mjs` use Node; `.ts` uses Bun. Missing or unsupported runners produce an explicit unexercised warning, not a successful execution check. Bun probes disable automatic package installation. Python 3.8+ and its stdlib are sufficient for the validator and its own tests. The execution contract is for **trusted code**, not an OS sandbox: a malicious script can bypass cwd/environment isolation. Inspect untrusted skills before running this validator.

## Body content

The Markdown body has no format restrictions. Recommended sections (use when applicable, in this order):

1. `## Overview` — one-paragraph summary.
2. `## When to Use` — concrete scenarios; examples belong inline here.
3. Domain-specific workflow sections (e.g. `## Steps`, `## Process`).
4. `## Common Rationalizations` — why someone might skip a step.
5. `## Red Flags` — warning signs of misapplication.
6. `## Verification` — how to confirm correct output.
7. `## See Also` — related skills or references.

Do NOT create `## Triggers` or `## Do not use for` sections — triggers and anti-triggers belong in the frontmatter `description` (the only field the agent sees at load time). Do NOT create a `## Validation checklist` section — validation is owned by the bundled validator and eval loops. Do NOT create a segregated `## Example` section — examples belong inline in workflow sections.

The full body is loaded once the skill is activated. Keep it focused. Move deep content to `references/`.

## Optional directories

### `scripts/`

Executable code the agent can run. Guidance: see [scripts-guide.md](scripts-guide.md).

- Be self-contained or document dependencies.
- Include helpful error messages.
- Handle edge cases gracefully.
- Support `--help` for agentic discovery.

Common languages: Python, Bash, JavaScript. Inline dependency declarations exist for Python (PEP 723), Deno, Bun, and Ruby.

### `references/`

Additional documentation the agent reads on demand. Convention: focused files, one topic each. Examples:

- `REFERENCE.md` — detailed technical reference
- `FORMS.md` — form templates or structured data formats
- Domain files (`finance.md`, `legal.md`, etc.)

Smaller files = less context. The agent only loads what it needs.

### `assets/`

Static resources the agent uses in output:

- Document templates
- Configuration templates
- Images (diagrams, examples)
- Data files (lookup tables, schemas)

Reference them from SKILL.md with a clear "when to use" clause.

## Progressive disclosure

Agents load skills progressively, in three stages:

1. **Discovery** — only `name` and `description` of each available skill.
2. **Activation** — full `SKILL.md` body when the task matches.
3. **Execution** — referenced files (scripts, references, assets) loaded only as needed.

Implications for skill design:

- Keep `name` and `description` rich enough to trigger correctly.
- Keep `SKILL.md` under **500 lines** and **5000 tokens** of body.
- Reference linked files with explicit load conditions.

## File references

When referencing other files, use **relative paths from the skill root**:

````markdown
See [the reference guide](references/spec.md) for details.

Run the validator:

```bash
python3 scripts/validate.py ./my-skill
```
````

Keep references one level deep from `SKILL.md`. Avoid deeply nested chains.

## Validation

This skill ships its own bundled validator at `../scripts/validate.py` (stdlib-only, no external deps, JSON output for agentic consumption). Use it as the single source of truth for what the format requires.

### Added checks

All existing format, body, and reverse-link checks remain. New checks are additive:

| Check name | Failure severity | Meaning |
|---|---|---|
| `forward_link:SOURCE:TARGET` | Error | A concrete file citation does not resolve to a regular file inside the skill. |
| `requires_declared` | Warning | Executable prerequisites are undeclared; presence is unknown. |
| `requires_valid` | Error | A declared `requires` value violates the field grammar above. |
| `prerequisite:COMMAND` | Warning | A declared executable is missing on PATH. Never installed automatically. |
| `artifact_owner_declared` | Warning | Artifact ownership is undeclared. |
| `artifact_owner_valid` | Error | Declared owner is not one of the three enum values. |
| `script_tests_valid` | Error | The script-test map or an argument value is malformed. |
| `script_test_target:PATH` | Error | A declared test points at a missing script. |
| `script_test_declared:PATH` | Warning | No behavioral test is declared; only help is probed. |
| `script_execution:PATH` | Error, or warning if no runner | Probe failed, timed out, could not launch, or could not be exercised. The message distinguishes these outcomes. |
| `catalog_available` | Warning | The published registry could not be found/read; collision checking is incomplete. |
| `trigger_collision:OTHER` | Warning | Candidate and another published skill claim an identical explicit positive trigger or identical description. The message names both. |

**Forward-link scope:** Scan the SKILL.md body and every Markdown file recursively under `references/`. Check concrete `references/`, `scripts/`, and `assets/` path citations in prose, inline code, and command fences, plus local Markdown link targets (including sibling links). Root-prefixed paths resolve from the skill root; sibling/parent-relative Markdown links resolve from the containing document. Strip fragments and trailing prose punctuation. External URLs, directory-only mentions, globs, and placeholder paths are not concrete file citations. Markdown/MD template fences and fences explicitly labeled `example` are illustrative, not file dependencies. Use a four-backtick outer fence when showing a template that itself contains triple-backtick fences. Asset templates and fixture bodies are not recursively validated as skills during their parent's validation; fixture tests validate them independently.

**Collision scope:** Auto-discover the ancestor package's `catalog/v1/registry.json`, or pass `--catalog FILE` with its `{skills: [{id, description}]}` data shape. Skip the candidate's own ID. Compare case/whitespace-normalized complete descriptions and exact normalized explicit trigger phrases after a `Trigger:`/`Triggers:` label. Quoted phrases are preferred; comma/semicolon-separated phrases are supported otherwise. Normalize phrase punctuation and case; accept slash triggers or phrases with at least two words. Exclude `Do NOT use`, `Don't use`, and `Not for` clauses. Shared generic description words alone do not warn. This conservative lexical check does not claim semantic similarity detection.

### Executable controls and reporting

```bash
python3 scripts/validate.py --self-test
python3 scripts/validate.py ./candidate --format json --json-out ./report.json
```

The bundled `assets/test_validate.py` runs good and bad fixture controls under `assets/fixtures/`, executing the CLI as well as the Python API. It proves missing links, import failure, timeout failure, collision warnings, prerequisite readiness, scratch isolation, and preservation of format errors. Test outputs are created only in temporary directories. The repository's standard `bun run test` invokes this suite, and both CI and the tag-triggered catalog release run `python3 -B packages/skills/scripts/validate-skills.py --baseline packages/skills/skills/skill-forge/references/validation-baseline.json` across the catalog. Never add a strict per-skill `scripts/validate.py` loop to a repository workflow: that bypasses the ratchet and fails on the listed findings.

JSON keeps `path`, `checks` (each with `name`, `passed`, `message`, `severity`), `passed`, `failed`, `warnings`, `summary`, and `next_steps`. Additions on a structurally parseable skill are:

- `prerequisites`: array of `{command, present}`; no installation paths or environment secrets.
- `environment_ready`: `true` when all declared executable prerequisites are present (including `requires: none`), `false` when one is missing, `null` when undeclared or invalid. Early format failures do not include these fields; treat absence as unknown.
- `artifact_owner`: the declared owner, or `null` when absent.

A warning has `passed: false` and `severity: warning`; it never increments `failed`. Exit 0 means no errors, **not** complete behavioral coverage or environment readiness. Exit 1 means errors; exit 2 means invalid CLI usage. `--format json`, `--format both`, `--pretty-json`, and `--json-out` retain their reporting semantics. Check warning details as well as readiness before trusting a runtime-dependent verdict.

### Initial catalog baseline

The baseline is an integration ratchet, not a relaxation of any validator check. `references/validation-baseline.json` lists these pre-existing missing citations exposed by the new checks:

| Skill | Missing citation |
|---|---|
| `constraint-driven-development` | floor-guard reference |
| `shipping-and-launch` | definition-of-done reference |
| `test-driven-development` | testing-patterns reference |
| `using-agent-skills` | definition-of-done reference |

These four skills continue to receive error verdicts from the validator. They are outside this change's content scope. The catalog CI command accepts exactly these named findings; new errors fail it, and resolved findings require removal of their now-stale baseline entries. All 33 existing skills passed the original format checks before this addition.

Do not fix these four by editing the validator or the baseline entry shape: correct the citation inside the owning skill, then delete that skill's baseline entry in the same change, which the ratchet requires. Corrections are tracked as separate follow-ups so each owning skill can restore the cited reference:

| Follow-up | Owning skill | Citation to correct | Baseline entry to remove once resolved |
|---|---|---|---|
| Point the body at the existing floor-guard guidance or restore the reference file | `constraint-driven-development` | floor-guard reference | `forward_link:SKILL.md:references/floor-guard.md` |
| Point the body at the shared definition-of-done document or ship a skill-local copy | `shipping-and-launch` | definition-of-done reference | `forward_link:SKILL.md:references/definition-of-done.md` |
| Point the body at the shared testing-patterns document or ship a skill-local copy | `test-driven-development` | testing-patterns reference | `forward_link:SKILL.md:references/testing-patterns.md` |
| Point the body at the shared definition-of-done document or ship a skill-local copy | `using-agent-skills` | definition-of-done reference | `forward_link:SKILL.md:references/definition-of-done.md` |

The validator keeps reporting these as errors for direct single-skill runs (`python3 scripts/validate.py <skill>`); only the repository-level checker treats them as accepted debt. A run that prints `Stale baseline` means the owning skill was fixed and its entry must be deleted.
