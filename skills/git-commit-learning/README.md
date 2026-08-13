<p align="center">
  <img src="https://img.shields.io/badge/Skill-git--commit--learning-blue?style=for-the-badge" alt="skill badge" />
  <img src="https://img.shields.io/badge/Stack-Agnostic-green?style=for-the-badge" alt="stack agnostic" />
  <img src="https://img.shields.io/badge/Version-1.0.0-purple?style=for-the-badge" alt="version" />
</p>

<h1 align="center">📚 git-commit-learning</h1>

<p align="center">
  <strong>Transforma histórico Git em memória de projeto para agentes de IA.<br/>Analisa commits para extrair padrões. Escreve commits que ensinam.<br/>Modelo RPI: Research → Plan → Implement → Verify.</strong>
</p>

---

## ✨ What Is This Skill?

**git-commit-learning** ensina agentes de IA a usar o histórico Git como fonte de aprendizado do projeto. Dois modos:

- **ANALYZE** — Lê o `git log`, extrai padrões do projeto, decisões técnicas e produz lições reutilizáveis.
- **WRITE** — Cria mensagens de commit estruturadas no formato RPI (Research, Plan, Implement) com validação binária.

Baseado nos princípios de Context Engineering e nas práticas de desenvolvimento assistido por IA: spec-first, decisões explícitas, validação reprodutível.

---

## 🚀 Quick Start

### Installation

Install with the catalog installer (`npx @runecraft/skills install`) or copy the skill folder manually — see the [catalog README](../../README.md) for targets and options.

### Common Triggers (PT/EN)

| Mode | Português | English |
|------|-----------|---------|
| **Analyze** | "analisa o histórico do módulo billing" | "analyze billing module git history" |
| **Analyze** | "extraia padrões dos commits recentes" | "extract patterns from recent commits" |
| **Write** | "cria um commit para essa mudança" | "write a commit message for this change" |
| **Write** | "commita isso para IA aprender" | "commit this so AI can learn from it" |

---

## 📝 RPI Commit Template

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

---

## ✅ Example (PT/EN)

### Português

```text
feat(api): implementa integração com Stripe conforme task CAM-42

[CONTEXTO]
- Resolvida a task CAM-42 referente ao fluxo de checkout.
- Implementação segue a Spec em docs/specs/payments-v1.md.

[ALTERAÇÕES ATÔMICAS]
- Adicionado StripeService para gerenciar sessões de checkout.
- Criado endpoint POST /payments/create-session validado por DTO.
- Configurado webhook para checkout.session.completed.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Utilizada versão 14.x do SDK do Stripe por compatibilidade com rules do projeto.
- Optado por não persistir dados sensíveis localmente, delegando segurança ao Stripe conforme RFC-09.

[VALIDAÇÃO]
- npm test src/services/stripe.service.spec.ts — passou (8/8).
- npm run typecheck — passou.
- npm run lint — passou.
```

### English

```text
feat(api): implement Stripe integration per task CAM-42

[CONTEXTO]
- Resolves task CAM-42 for the checkout flow.
- Implementation follows the Spec in docs/specs/payments-v1.md.

[ALTERAÇÕES ATÔMICAS]
- Added StripeService to manage checkout sessions.
- Created POST /payments/create-session endpoint validated by DTO.
- Configured webhook for checkout.session.completed events.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Used Stripe SDK v14.x for compatibility with project rules.
- Chose not to persist sensitive data locally, delegating security to Stripe per RFC-09.

[VALIDAÇÃO]
- npm test src/services/stripe.service.spec.ts — passed (8/8).
- npm run typecheck — passed.
- npm run lint — passed.
```

---

## 📁 Structure

```
git-commit-learning/
├── SKILL.md                     — Agent instructions (load this)
├── .skill-meta.json             — Metadata
├── README.md                    — Human documentation
└── references/
    └── commit-patterns.md       — Templates, anti-patterns, bilingual examples
```

---

## 🔄 The Two Modes

### ANALYZE — Extract Project Knowledge from Git

```
DECIDE → SCOPE → INVESTIGATE → EXTRACT → REPORT
```

1. Define escopo: arquivo, módulo, domínio ou período.
2. Usa comandos Git somente leitura (`git log`, `git show`, `git blame`).
3. Extrai estrutura por commit: scope, type, intent, decision, validation.
4. Detecta padrões recorrentes com nível de confiança (HIGH/MEDIUM/LOW).
5. Produz AI Lessons reutilizáveis com evidência de commits.

### WRITE — Create AI-Learnable Commits (RPI Model)

```
READ DIFF → CLASSIFY → RESEARCH → PLAN → IMPLEMENT → WRITE → VERIFY
```

1. Lê diff e status.
2. Classifica: type, scope, size (TRIVIAL/NORMAL/SIGNIFICANT).
3. **Research**: coleta referências (task, spec, ticket, issue, log).
4. **Plan**: extrai decisões técnicas e alternativas rejeitadas.
5. **Implement**: lista alterações atômicas verificáveis.
6. **Write**: monta mensagem no template RPI.
7. **Verify**: confere se as 4 perguntas estão respondidas.

---

## ❌ Anti-Patterns the Skill Rejects

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

---

## 🤖 Compatibility

| Agent | Status |
|-------|--------|
| Claude Code | ✅ |
| Cursor | ✅ |
| Opencode | ✅ |
| GitHub Copilot | ✅ |

---

## 🔗 Integration

| Skill | How |
|-------|-----|
| **spec-driven** | During BUILD phase: reads spec/tasks for [CONTEXTO], uses acceptance criteria for [VALIDAÇÃO], extracts decisions from design doc for [DECISÕES TÉCNICAS] |

---

## 📄 License

MIT

---

<p align="center">
  <sub>Part of the <a href="https://github.com/runecraftai/skills">Runecraft Skills</a> catalog</sub>
</p>
