---
name: git-commit-learning
description: >
  Transforms Git history into reusable project memory for AI agents. Guides agents to analyze git log to extract domain patterns, decisions, and lessons, and to write AI-learnable commit messages with context, intent, validation, and domain signals. Use when asked to "analyze git history", "extract project learnings from commits", "write a commit message the AI can learn from", "make commits searchable for agents", "teach agents through Git", "review commit history for context", or "extract AI lessons from PRs". Also trigger on Portuguese: "analisa o histórico", "extrai aprendizado dos commits", "cria commit para IA aprender", "faz o git virar memória". Do NOT use for generic Git commands (status, push, pull, branch), release notes, changelogs, merge conflict resolution, or code review.
license: CC-BY-4.0
---

# git-commit-learning

Transforma o histórico Git em memória de projeto reutilizável para agentes de IA. Dois modos: **análise** (extrair aprendizado do histórico) e **escrita** (criar commits que ensinam). Baseado no fluxo RPI: Research (contexto e referências), Plan (decisões técnicas), Implement (alterações atômicas).

```
DECIDE MODE → RESEARCH → EXECUTE → VERIFY
```

---

## Mode Decision

Antes de agir, decida o modo com base no pedido do usuário.

| Trigger | Mode | Action |
|---------|------|--------|
| "analisa histórico", "aprenda com git", "extraia padrões", "veja como foi feito", "use git para entender", "extract learnings" | **ANALYZE** | Ler histórico, extrair padrões e lições |
| "crie commit", "escreva mensagem", "commitar isso", "gere commit", "como commitar", "write commit" | **WRITE** | Escrever mensagem de commit ensinável |
| "analisa e depois commita", "veja o histórico e crie o commit" | **BOTH** | Analisar primeiro, escrever depois |

---

## Mode: ANALYZE

Use quando o usuário quer extrair conhecimento do histórico Git sem modificar nada.

### Step 1: Scope the Investigation

Identifique o que pesquisar:
- Se o usuário mencionou um arquivo ou módulo: use `git log --oneline -- <path>`
- Se mencionou um domínio: busque por commits com o nome do domínio
- Se é exploração geral: use `git log --oneline -30` para visão recente

Comandos somente leitura permitidos:

```bash
git log --oneline -- <path>
git log --follow --stat -- <path>
git log -p -- <path>
git show --stat <hash>
git show <hash>
git log --grep="<pattern>" --oneline
git log --author="<name>" --oneline
git log --since="<date>" --oneline
```

**Nunca** execute comandos que modificam o repositório durante análise.

### Step 2: Extract Structure

Para cada commit relevante, extraia:

```text
Commit: <hash> — <subject>
Scope: <domínio afetado — billing, auth, catalog, etc.>
Type: feat | fix | refactor | docs | test | chore | perf | security
Intent: <por que essa mudança foi feita>
Decision: <que decisão técnica foi tomada>
Validation: <como foi validado, se houver evidência>
```

### Step 3: Detect Patterns

Agrupe commits por domínio e identifique:

```text
Recurring scopes: (quais domínios mais mudam)
Commit type distribution: (muitos fix? muitos refactor?)
Validation patterns: (testes? typecheck? lint?)
Decision patterns: (que tipos de decisão aparecem?)
```

### Step 4: Produce AI Lessons

Transforme padrões em lições reutilizáveis:

```text
AI Lesson:
- Trigger: <quando aplicar este conhecimento>
- Avoid: <antipadrão detectado no projeto>
- Prefer: <padrão correto observado nos commits>
- Evidence: <commits que suportam esta lição>
```

**Separe fatos de inferências.** Só declare como padrão do projeto o que tiver evidência em múltiplos commits.

### Step 5: Report

Output final deve incluir:

```text
Scope: <arquivos e domínio analisados>
Time range: <período coberto>
Commits examined: <quantidade>
Patterns found: <padrões detectados com evidência>
AI Lessons: <lições extraídas>
Confidence: <HIGH | MEDIUM | LOW — baseado na quantidade de evidência>
```

---

## Mode: WRITE

Use quando o usuário quer commitar mudanças e quer que o commit sirva como aprendizado futuro para IA.

### Step 1: Read the Diff

```bash
git diff --staged
git status --short
```

Se nada estiver staged, pergunte ao usuário se deve commitar tudo ou selecionar arquivos.

### Step 2: Classify the Change

Determine:

```text
Type: feat | fix | refactor | docs | test | chore | perf | security
Scope: <domínio — billing, identity, catalog, auth, infra, docs, ai, etc.>
Size: TRIVIAL (1 arquivo, sem decisão) | NORMAL (2-5 arquivos) | SIGNIFICANT (6+ arquivos ou decisão arquitetural)
```

Se a mudança for SIGNIFICANT, pergunte ao usuário se quer dividir em commits incrementais.

### Step 3: Research — Collect Context

Antes de escrever a mensagem, colete referências:

```text
Existe task, spec, design doc, ADR, RFC ou issue relacionada?
Qual problema de negócio motivou a mudança?
Qual o escopo — está contido em um só domínio?
```

Se não souber as respostas, pergunte ao usuário. **Nunca invente contexto.**

### Step 4: Plan — Extract Decisions

Identifique decisões técnicas que merecem registro:

```text
Qual decisão técnica foi tomada?
Qual alternativa foi rejeitada (e por quê)?
Existe ADR ou RFC que documenta esta decisão?
```

Nem todo commit tem decisão arquitetural. Registre apenas quando houver escolha técnica relevante para o futuro.

### Step 5: Implement — List Atomic Changes

Liste as alterações atômicas — cada item deve ser verificável no diff:

```text
- O que foi adicionado, modificado ou removido.
- Uma ação por linha.
- Evitar misturar domínios não relacionados.
```

### Step 6: Decide Template

| Size | Template |
|------|----------|
| TRIVIAL | Curto: `<type>(<scope>): <descrição precisa>` |
| NORMAL | Full RPI template |
| SIGNIFICANT | Full RPI template + consider splitting into incremental commits |

### Step 7: Write the Message — RPI Template

Template completo (use para NORMAL e SIGNIFICANT):

```text
<type>(<scope>): <descrição clara da mudança comportamental>

[CONTEXTO]
- <task, spec, design doc, RFC, ADR, issue ou referência que originou esta mudança>
- <problema de negócio ou técnico que motivou a mudança>
- <escopo — domínio afetado, compatibilidade>

[ALTERAÇÕES ATÔMICAS]
- <ação 1 — adicionado, modificado, removido>
- <ação 2>
- <ação N>

[DECISÕES TÉCNICAS (Mini-ADR)]
- <decisão tomada>
- <alternativa rejeitada, se relevante>
- <razão da escolha>
- <ref para ADR/RFC quando existir>

[VALIDAÇÃO]
- <comando executado> — <passou | falhou>
- <comando 2> — <passou | falhou>
- Se não houver teste automatizado, explicar por quê.
```

O commit ideal conecta as 4 fases do RPI:

```text
Research → [CONTEXTO]: de onde veio e por quê.
Plan → [DECISÕES TÉCNICAS]: o que foi decidido.
Implement → [ALTERAÇÕES ATÔMICAS]: o que foi feito.
Verify → [VALIDAÇÃO]: como foi comprovado.
```

### Step 8: Verify the Message

Antes de propor o commit, confira:

- [ ] Scope reflete o domínio correto
- [ ] Título descreve o comportamento, não a implementação
- [ ] [CONTEXTO] referencia task/spec/ADR quando existir
- [ ] [ALTERAÇÕES ATÔMICAS] são verificáveis no diff
- [ ] [DECISÕES TÉCNICAS] capturam escolhas relevantes (não genéricas)
- [ ] [VALIDAÇÃO] usa comandos reais com resultado binário (passou/falhou)
- [ ] Se não há teste, o motivo está explicado

---

## RPI Commit Model

O modelo RPI (Research, Plan, Implement) + Verify garante que o histórico Git seja uma fonte completa de contexto para IA:

| Fase | Seção no Commit | Pergunta que Responde |
|------|----------------|----------------------|
| **Research** | [CONTEXTO] | De onde veio? Por quê? Qual o problema? |
| **Plan** | [DECISÕES TÉCNICAS (Mini-ADR)] | O que foi decidido? Qual alternativa foi rejeitada? |
| **Implement** | [ALTERAÇÕES ATÔMICAS] | O que foi feito exatamente? |
| **Verify** | [VALIDAÇÃO] | Como foi comprovado que funciona? Passou ou falhou? |

Quando uma IA futura lê `git log`, ela pode:
1. Usar as referências em [CONTEXTO] para buscar specs e tickets via MCP.
2. Usar [DECISÕES TÉCNICAS] para manter coerência arquitetural.
3. Usar [VALIDAÇÃO] como âncora de confiança — output binário, não julgamento subjetivo.
4. Usar [ALTERAÇÕES ATÔMICAS] para entender o escopo real da mudança.

---

## Examples (PT/EN)

### Exemplo em Português

```text
feat(api): implementa integração com Stripe conforme task CAM-42

[CONTEXTO]
- Resolvida a task CAM-42 referente ao fluxo de checkout.
- Implementação segue a Spec em docs/specs/payments-v1.md.
- Vinculado ao Design Doc de Arquitetura de Pagamentos para conformidade com padrões do projeto.

[ALTERAÇÕES ATÔMICAS]
- Adicionado StripeService para gerenciar sessões de checkout.
- Criado endpoint POST /payments/create-session validado por DTO.
- Configurado webhook para ouvir eventos de checkout.session.completed.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Utilizada versão 14.x do SDK do Stripe por compatibilidade com as rules do projeto.
- Optado por não persistir dados sensíveis localmente, delegando segurança ao Stripe conforme RFC-09.

[VALIDAÇÃO]
- npm test src/services/stripe.service.spec.ts — passou (8/8).
- curl -X POST /payments/create-session — retornou session URL (201).
- npm run typecheck — passou.
- npm run lint — passou.
```

### Example in English

```text
feat(api): implement Stripe integration per task CAM-42

[CONTEXTO]
- Resolves task CAM-42 for the checkout flow.
- Implementation follows the Spec in docs/specs/payments-v1.md.
- Aligned with the Payments Architecture Design Doc to ensure project standards.

[ALTERAÇÕES ATÔMICAS]
- Added StripeService to manage checkout sessions.
- Created POST /payments/create-session endpoint validated by DTO.
- Configured webhook to listen for checkout.session.completed events.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Used Stripe SDK v14.x for compatibility with project rules.
- Chose not to persist sensitive data locally, delegating security to Stripe per RFC-09.

[VALIDAÇÃO]
- npm test src/services/stripe.service.spec.ts — passed (8/8).
- curl -X POST /payments/create-session — returned session URL (201).
- npm run typecheck — passed.
- npm run lint — passed.
```

---

## Commit Quality Rules

### Reject (peça para refinar)

```text
fix: ajustes
update
wip
cleanup
mudanças finais
refactor: melhora código
fix: corrige bug
feat: adiciona feature
```

Motivo: vagos demais. Uma IA futura não consegue entender o que mudou nem por quê.

### Reject — Validation Without Binary Result

```text
[VALIDAÇÃO]
- testado manualmente
- parece funcionar
- revisão ok
```

Motivo: subjetivo. IA trabalha melhor com "passou/falhou", não com julgamentos subjetivos de qualidade.

### Prefer

```text
fix(billing): resolve TaxOverride ausente para clientes EU
refactor(catalog): centraliza normalização de SKU no domínio catalog
feat(auth): adiciona logout OIDC com revogação de sessão
docs(ai): registra padrão de commits ensináveis para agentes
```

### Cross-Domain Changes

Se a mudança toca múltiplos domínios, avalie:

- É um rename de campo público de evento? → Um commit, scope do domínio dono, explique o impacto.
- São mudanças independentes em billing e catalog? → Commits separados por domínio.
- Não tem como separar? → Use scope mais amplo e explique o motivo.

```text
refactor(events): renomeia PaymentCaptured.userId para customerId

[CONTEXTO]
- userId era ambíguo — não deixava claro se era o usuário logado ou o cliente da transação.

[ALTERAÇÕES ATÔMICAS]
- Renomeado campo userId para customerId no evento PaymentCaptured.
- Atualizados consumidores: billing, orders, analytics.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Campo de evento público — mudança precisa ser atômica para evitar inconsistência entre serviços.

[VALIDAÇÃO]
- npm test —events — passou (34/34).
- Publishers e consumers validados com schema registry.
```

---

## Incremental Commits

Para mudanças SIGNIFICANT, proponha sequência de commits atômicos:

```text
feat(auth): adiciona contrato para logout OIDC
feat(auth): implementa revogação de sessão local
feat(auth): integra redirect OIDC ao fluxo de logout
test(auth): cobre logout OIDC e fallback legado
docs(auth): registra decisão de compatibilidade com login legado
```

Cada commit deve ser autocontido e responder às 4 perguntas RPI: de onde veio, o que foi decidido, o que foi feito, como foi comprovado.

---

## What Makes a Commit AI-Learnable

Um commit é útil para IA futura quando responde estas perguntas:

```text
De onde veio?        → [CONTEXTO] — task, spec, ticket, issue.
O que foi decidido?  → [DECISÕES TÉCNICAS] — escolha, alternativa descartada, razão.
O que foi feito?     → [ALTERAÇÕES ATÔMICAS] — ações verificáveis no diff.
Como foi comprovado? → [VALIDAÇÃO] — comandos executados, resultado binário (passou/falhou).
```

Se o commit não responde a maioria dessas perguntas, ele serve para humano ver diff mas não serve para IA aprender o projeto via Git.

---

## Error Recovery

### Nothing staged

Pergunte: "Nada staged. Quer commitar todas as mudanças ou selecionar arquivos específicos?"

### Empty diff after analysis

Reporte: "Nenhum commit encontrado para o escopo solicitado. Amplie o período ou o caminho."

### User rejects message

Ajuste com base no feedback. Pergunte qual parte não ficou clara e refine.

### Ambiguous scope

Se não conseguir determinar o domínio pelo diff, pergunte ao usuário em vez de adivinhar.

### No task/spec reference

Se não houver task ou spec associada, não invente. Use apenas o [CONTEXTO] com o problema de negócio. Se o usuário mencionar uma task, inclua.

---

## Integration with spec-driven

Quando spec-driven estiver ativo e um commit for gerado durante a fase BUILD:
- Use a spec como referência em [CONTEXTO]
- Use os acceptance criteria da task como base para [VALIDAÇÃO]
- Extraia decisões do design doc para [DECISÕES TÉCNICAS (Mini-ADR)]
- Inclua o ID da task na primeira linha de [CONTEXTO]

---

## Further Reference

Para exemplos detalhados, anti-padrões e variações por tipo de commit (feat, fix, refactor, docs, test, perf, security), leia `references/commit-patterns.md`.
