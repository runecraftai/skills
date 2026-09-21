# Grimoire Skill Human Documentation

Human-facing reference material for skills in the Grimoire catalog. This file consolidates documentation that was previously in per-skill README files.

---

## git-commit-learning

### Quick Start

Install with the catalog installer (`npx @runecraft/grimoire install`) or copy the skill folder manually.

### Common Triggers (PT/EN)

| Mode | Português | English |
|------|-----------|---------|
| **Analyze** | "analisa o histórico do módulo billing" | "analyze billing module git history" |
| **Analyze** | "extraia padrões dos commits recentes" | "extract patterns from recent commits" |
| **Write** | "cria um commit para essa mudança" | "write a commit message for this change" |
| **Write** | "commita isso para IA aprender" | "commit this so AI can learn from it" |

### RPI Commit Template

```text
<type>(<scope>): <descrição clara da mudança>

[CONTEXTO]
- <task, spec, ticket, issue>
- <problema de negócio>

[ALTERAÇÕES ATÔMICAS]
- <ações verificáveis no diff>

[DECISÕES TÉCNICAS (Mini-ADR)]
- <decisão, alternativa rejeitada, razão>

[VALIDAÇÃO]
- <comando> — <passou | falhou>
```

RPI = Research → Plan → Implement → Verify.

### Anti-Patterns the Skill Rejects

```text
fix: ajustes                          # no domain, no intent
wip / update / cleanup                # zero context
refactor: melhora código              # what was improved? why?

[VALIDAÇÃO]
- testado manualmente                 # subjective, not reproducible
- parece funcionar                    # binary result or nothing

[DECISÕES TÉCNICAS]
- Seguir boas práticas.               # generic, teaches nothing
```

### Compatibility

| Agent | Status |
|-------|--------|
| Claude Code | ✅ |
| Cursor | ✅ |
| Opencode | ✅ |
| GitHub Copilot | ✅ |

### Integration

| Skill | How |
|-------|-----|
| **spec-driven** | During BUILD phase: reads spec/tasks for [CONTEXTO], uses acceptance criteria for [VALIDAÇÃO], extracts decisions from design doc for [DECISÕES TÉCNICAS] |

---

## skill-forge

### Quick Start

Install manually by copying `skills/skill-forge/` into your agent's skills directory, or use the `grimoire` installer TUI shipped with the package:

| Agent | Path |
|---|---|
| VS Code + Copilot | `.agents/skills/skill-forge/` |
| Claude Code | `.claude/skills/skill-forge/` |
| Cursor | `.cursor/skills/skill-forge/` |
| OpenCode | `.opencode/skill/skill-forge/` |

### How to use it

1. Open your agent in agentic mode.
2. Invoke `/forge` (or describe your intent: "create a skill that does X").
3. Answer the discovery questions one cluster at a time.
4. The skill will draft, validate, and (if you wish) optimize the new skill.
5. At the **DELIVER** step, the new skill lands in the right directory and (if publishing) gets a catalog row and a release note.

### Anatomy

```
skill-forge/
├── SKILL.md                            # The 6-phase workflow (agent instructions)
├── references/
│   ├── spec.md                         # open SKILL.md format specification
│   ├── authoring-patterns.md           # Best practices: gotchas, templates, validation loops
│   ├── description-optimization.md     # Trigger eval with train/val split
│   ├── output-evaluation.md            # With-skill vs without-skill quality eval
│   └── scripts-guide.md                # PEP 723, agentic script design, --help, exit codes
├── scripts/
│   └── validate.py                     # Stdlib-only spec validator (PEP 723 friendly)
└── assets/
    └── SKILL.template.md               # Blank template for new skills
```

### Conformance to the open SKILL.md format

| Spec field | skill-forge value |
|---|---|
| `name` | `skill-forge` (kebab-case, matches folder) |
| `description` | 1024-char max, EN+PT triggers, explicit exclusions |
| `license` | `CC-BY-4.0` |
| `metadata.version` | `1.0.0` |
| Frontmatter delimiters | Exactly `---` on their own lines |
| `SKILL.md` casing | Exact |
| Body length | Under the 500-line cap |

### Compatibility

| Agent | Status |
|---|---|
| Claude Code | ✅ Tested |
| OpenCode | ✅ Tested |
| Cursor | ✅ Tested |
| GitHub Copilot | ✅ Tested |
| Antigravity (Gemini) | ✅ Tested |

---

## spec-driven

### Quick Start

| What You Want | Say This |
|---------------|----------|
| Specify a feature | `/spec` or `specify feature` or `vamos especificar` |
| Discuss gray areas | `discuss feature` or `discutir este caso` |
| Design the approach | `design` or `design da feature` |
| Break into tasks | `plan this` or `quebrar em tarefas` |
| Implement | `/build` or `implement` or `implementar` |
| Validate / verify | `validate`, `verify work`, `UAT`, `validar implementação` |
| Pause session | `/spec pause` or `pausar trabalho` |
| Resume session | `/spec resume` or `retomar trabalho` |

### Complete Trigger Reference

#### English Triggers

| Phase | Triggers |
|-------|----------|
| **SPECIFY** | `/spec`, `specify feature`, `write spec`, `what should we build` |
| **DISCUSS** | `discuss feature`, `capture context`, `how should this work` |
| **DESIGN** | `design`, `design the feature` |
| **TASKS** | `break into tasks`, `create tasks` |
| **EXECUTE** | `/build`, `implement`, `execute tasks` |
| **VALIDATE** | `validate`, `verify work`, `UAT`, `walk me through it` |
| **MEMORY** | `record decision`, `pause work`, `resume work` |
| **LESSONS** | `load lessons`, `record lesson`, `distill lessons` |

#### Portuguese Triggers

| Fase | Triggers |
|------|----------|
| **SPECIFY** | `vamos especificar`, `preciso de um spec`, `especificar feature` |
| **DISCUSS** | `discutir feature`, `discutir este caso` |
| **DESIGN** | `design da feature`, `arquitetura` |
| **TASKS** | `quebrar em tarefas`, `criar tarefas` |
| **EXECUTE** | `implementar`, `build`, `construir` |
| **VALIDATE** | `validar implementação`, `verificar`, `testar comigo` |
| **MEMORY** | `pausar trabalho`, `retomar trabalho`, `salvar decisão` |
| **LESSONS** | `carregar lições`, `registrar lição` |

### Tips for Best Results

**Do's:**
- Trigger naturally in PT or EN — the skill understands both
- Trust the auto-sizing — the skill decides phase depth from scope
- Read reference files completely (to EOF) before acting on them
- Say `/spec pause` before ending a session
- Let the Verifier run — never skip it, never self-validate

**Don'ts:**
- Don't weaken, skip, or delete tests to make them pass
- Don't batch multiple tasks into a single commit
- Don't load multiple feature specs simultaneously
- Don't fabricate APIs or patterns — follow the Knowledge Verification Chain
- Don't accept "tests pass" without checking the test asserts spec outcomes, not implementation details

### Compatibility

| Agent | Status | Notes |
|-------|--------|-------|
| **Claude Code** | ✅ Fully supported | Primary reference agent |
| **Cursor** | ✅ Fully supported | Excellent for inline editing |
| **Opencode** | ✅ Fully supported | Multi-agent routing works natively |
| **GitHub Copilot** | ✅ Fully supported | Via custom instructions |

### FAQ

**Q: Why is the Verifier separate from the executor?**
A: Author ≠ verifier prevents the executor's mental model from biasing the validation. The Verifier re-derives coverage independently using evidence-or-zero.

**Q: What if a test passes but doesn't actually test the spec outcome?**
A: The spec-anchored outcome check flags this as a spec-precision gap. The test must be rewritten to assert spec-defined behavior.

**Q: What is the discrimination sensor?**
A: A mutation-testing pass. The Verifier injects behavior-level faults in scratch state and confirms the test suite kills them.

**Q: How do lessons work?**
A: Each grounded failure becomes a lesson via `scripts/lessons.py`. Confirmed lessons load into Specify and Design context. A clean PASS records nothing.

**Q: Can I use this for small bug fixes?**
A: Yes — that's the Small scope (≤3 files, one sentence). One-liner spec inline, implement, verify.

**Q: PT or EN?**
A: Both. All triggers work in Portuguese and English as first-class citizens. The skill body is English.

---

## spec-loop

### The loop

```
ROADMAP.md → pending milestones (M0..Mn)
  → feature tasks.md → atomic task
      → execute → verify ("Verificar:" criteria) → atomic commit → STATE.md
  → milestone gate (exit criteria) → next milestone
→ final spec.md acceptance (Success Criteria) → project done
```

One task at a time, in tasks.md order — never skip a "Depends on" edge. Verification runs for real: red means fix or stop, never advance. STATE.md is updated after every task.

### States

- `⬜ planned` → `▶️ in progress` → `✅ done` | `🛑 blocked` (reason + evidence)
- Milestone done only with green exit criteria; project done only with the spec.md final acceptance.

### Resume

Interrupted? Read STATE.md + recent commits → continue from the first non-done task. Never re-run tasks already done.
