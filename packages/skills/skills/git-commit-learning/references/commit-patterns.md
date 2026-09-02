# Commit Patterns Reference

Exemplos detalhados por tipo de commit, anti-padrões, e padrões de investigação. Carregue este arquivo quando precisar de exemplos concretos ou quando o SKILL.md não cobrir um caso específico. Todos os exemplos em **português** e **inglês**.

---

## RPI Template Structure

```text
<type>(<scope>): <descrição clara da mudança comportamental>

[CONTEXTO]
- <task, spec, design doc, RFC, ADR, issue ou referência>
- <problema de negócio ou técnico>
- <escopo e compatibilidade>

[ALTERAÇÕES ATÔMICAS]
- <ação verificável 1>
- <ação verificável 2>
- <ação verificável N>

[DECISÕES TÉCNICAS (Mini-ADR)]
- <decisão tomada>
- <alternativa rejeitada, se relevante>
- <razão da escolha>
- <ref para ADR/RFC quando existir>

[VALIDAÇÃO]
- <comando> — <passou | falhou>
- Se não houver teste, explicar por quê.
```

RPI flow:

```text
Research → [CONTEXTO]: de onde veio e por quê.
Plan → [DECISÕES TÉCNICAS]: o que foi decidido.
Implement → [ALTERAÇÕES ATÔMICAS]: o que foi feito.
Verify → [VALIDAÇÃO]: como foi comprovado.
```

---

## Templates by Change Type

### feat — Nova Funcionalidade

#### Português

```text
feat(checkout): adiciona validação de cupom antes da captura de pagamento

[CONTEXTO]
- Resolve a task CHK-088 reportada pelo time de operações.
- Cupons expirados estavam sendo aceitos, gerando estornos e reclamações.
- Escopo: domínio checkout, sem impacto em billing ou catalog.

[ALTERAÇÕES ATÔMICAS]
- Adicionado CouponValidator com regras de data, uso máximo e elegibilidade.
- Movida validação para antes de PaymentGateway.capture.
- Adicionado erro de domínio CouponInvalidError com mensagem específica.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Validação ocorre antes de qualquer side-effect externo (captura de pagamento).
- Alternativa rejeitada: validar após captura e estornar — custo operacional maior.
- Erro de domínio separado por tipo de falha (expirado, uso excedido, inválido).

[VALIDAÇÃO]
- npm test -- checkout — passou (22/22).
- Cenários manuais: cupom expirado, cupom válido, sem cupom — todos passaram.
- npm run typecheck — passou.
```

#### English

```text
feat(checkout): add coupon validation before payment capture

[CONTEXTO]
- Resolves task CHK-088 reported by operations team.
- Expired coupons were being accepted, causing chargebacks and complaints.
- Scope: checkout domain, no impact on billing or catalog.

[ALTERAÇÕES ATÔMICAS]
- Added CouponValidator with date, max usage, and eligibility rules.
- Moved validation before PaymentGateway.capture call.
- Added CouponInvalidError domain error with specific messages per failure type.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Validation runs before any external side-effect (payment capture).
- Rejected alternative: validate after capture then refund — higher operational cost.
- Domain error typed by failure reason (expired, overused, invalid).

[VALIDAÇÃO]
- npm test -- checkout — passed (22/22).
- Manual scenarios: expired coupon, valid coupon, no coupon — all passed.
- npm run typecheck — passed.
```

---

### fix — Correção de Bug

#### Português

```text
fix(billing): corrige cálculo de imposto para clientes internacionais

[CONTEXTO]
- Reportado em JIRA-321: clientes EU recebiam alíquota nacional.
- Log de erro: "TaxOverride not found 'EU'".
- Impacto: clientes da União Europeia desde 2026-03.

[ALTERAÇÕES ATÔMICAS]
- Alterado BillingService.resolveTaxRule para consultar countryCode antes do fallback nacional.
- Mantido comportamento original para clientes sem país informado.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Resolução hierárquica: countryCode → região → default nacional.
- Alternativa rejeitada: criar tabela de taxas por país — adiciona complexidade desnecessária no momento.
- Apenas 3 países na UE atualmente; se expandir, reavaliar com ADR.

[VALIDAÇÃO]
- npm test -- billing-tax — passou (14/14).
- Testado com countryCode 'DE', 'FR', 'BR', null — todos com alíquota correta.
- npm run typecheck — passou.
```

#### English

```text
fix(billing): correct tax calculation for international customers

[CONTEXTO]
- Reported in JIRA-321: EU customers received domestic tax rate.
- Error log: "TaxOverride not found 'EU'".
- Impact: European Union customers since 2026-03.

[ALTERAÇÕES ATÔMICAS]
- Changed BillingService.resolveTaxRule to check countryCode before domestic fallback.
- Preserved original behavior for customers without country info.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Hierarchical resolution: countryCode → region → domestic default.
- Rejected alternative: per-country tax table — adds unnecessary complexity now.
- Only 3 EU countries currently; if it grows, reassess with ADR.

[VALIDAÇÃO]
- npm test -- billing-tax — passed (14/14).
- Tested with countryCode 'DE', 'FR', 'BR', null — all correct rates.
- npm run typecheck — passed.
```

---

### refactor — Reestruturação Interna

#### Português

```text
refactor(catalog): centraliza normalização de SKU no domínio catalog

[CONTEXTO]
- Normalização de SKU estava duplicada em catalog, checkout e inventory.
- Cada módulo tinha regras ligeiramente diferentes — bugs recorrentes de SKU inconsistente.
- Decisão registrada em ADR-007: Single Source of Truth for SKU Normalization.

[ALTERAÇÕES ATÔMICAS]
- Criado CatalogService.normalizeSku() como fonte única de normalização.
- Removida lógica de normalização de checkout e inventory.
- Adicionado teste de contrato para garantir consistência entre consumidores.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Domínio catalog é o dono natural do SKU — centralizar lá reduz acoplamento.
- Alternativa rejeitada: shared kernel — adiciona dependência entre domínios.
- Contrato: normalizeSku(input: string): string, idempotente, trim + uppercase.

[VALIDAÇÃO]
- npm test -- catalog checkout inventory — passou (47/47).
- SKU "ABC-123 " normaliza para "ABC-123" em todos os módulos.
- npm run typecheck — passou.
```

#### English

```text
refactor(catalog): centralize SKU normalization in catalog domain

[CONTEXTO]
- SKU normalization was duplicated across catalog, checkout, and inventory.
- Each module had slightly different rules — recurring inconsistent SKU bugs.
- Decision recorded in ADR-007: Single Source of Truth for SKU Normalization.

[ALTERAÇÕES ATÔMICAS]
- Created CatalogService.normalizeSku() as single source of normalization.
- Removed normalization logic from checkout and inventory.
- Added contract test ensuring consistency across consumers.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Catalog domain is the natural owner of SKU — centralizing there reduces coupling.
- Rejected alternative: shared kernel — introduces cross-domain dependency.
- Contract: normalizeSku(input: string): string, idempotent, trim + uppercase.

[VALIDAÇÃO]
- npm test -- catalog checkout inventory — passed (47/47).
- SKU "ABC-123 " normalizes to "ABC-123" in all modules.
- npm run typecheck — passed.
```

---

### docs — Documentação

#### Português

```text
docs(ai): registra padrão de commits RPI para agentes de IA

[CONTEXTO]
- Agentes de IA precisam extrair contexto do histórico Git.
- Commits vagos como "fix: ajustes" não fornecem contexto pesquisável.
- Baseado nos princípios de Context Engineering e fluxo RPI.

[ALTERAÇÕES ATÔMICAS]
- Adicionado guia de commits em CONTRIBUTING.md com template RPI.
- Registrada decisão: commits significativos devem incluir [CONTEXTO], [ALTERAÇÕES ATÔMICAS], [DECISÕES TÉCNICAS] e [VALIDAÇÃO].

[VALIDAÇÃO]
- Sem build/test — documentação revisada por pares.
```

#### English

```text
docs(ai): document RPI commit pattern for AI agents

[CONTEXTO]
- AI agents need to extract context from Git history.
- Vague commits like "fix: stuff" provide no searchable context.
- Based on Context Engineering principles and RPI workflow.

[ALTERAÇÕES ATÔMICAS]
- Added commit guide to CONTRIBUTING.md with RPI template.
- Recorded decision: significant commits must include [CONTEXTO], [ALTERAÇÕES ATÔMICAS], [DECISÕES TÉCNICAS], and [VALIDAÇÃO].

[VALIDAÇÃO]
- No build/test — documentation peer-reviewed.
```

---

### test — Cobertura de Testes

#### Português

```text
test(auth): adiciona cobertura para logout OIDC e fallback legado

[CONTEXTO]
- Logout OIDC implementado sem testes de integração.
- Fallback para login legado nunca foi testado — risco de regressão em migração.

[ALTERAÇÕES ATÔMICAS]
- Adicionados 5 testes: logout com sessão ativa, sessão expirada, token inválido, fallback legado, e redirect via end_session_endpoint.
- Mock do provider OIDC cobre os 3 estados de resposta.

[VALIDAÇÃO]
- npm test -- auth — passou (12/12).
- Cobertura em auth.service.ts: 87% → 94%.
```

#### English

```text
test(auth): add coverage for OIDC logout and legacy fallback

[CONTEXTO]
- OIDC logout implemented without integration tests.
- Legacy login fallback was never tested — regression risk during migration.

[ALTERAÇÕES ATÔMICAS]
- Added 5 tests: logout with active session, expired session, invalid token, legacy fallback, and end_session_endpoint redirect.
- OIDC provider mock covers all 3 response states.

[VALIDAÇÃO]
- npm test -- auth — passed (12/12).
- Coverage in auth.service.ts: 87% → 94%.
```

---

### perf — Otimização de Performance

#### Português

```text
perf(catalog): reduz tempo de busca de produtos com cache de SKU

[CONTEXTO]
- Busca de produtos por SKU era o endpoint mais lento (P95: 340ms).
- Cada request consultava 3 serviços externos sequencialmente.
- Meta: P95 abaixo de 50ms.

[ALTERAÇÕES ATÔMICAS]
- Adicionado cache em memória com TTL de 5 minutos para ProductService.findBySku.
- Consultas em paralelo para os 3 serviços externos (Promise.all).
- Adicionada métrica de cache hit rate.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Cache local (não Redis) pela simplicidade — SKU é imutável, invalidação não é problema.
- TTL de 5 min é seguro: catálogo atualiza no máximo 1x/hora.
- Alternativa rejeitada: Redis — overkill para 3 serviços consumidores.

[VALIDAÇÃO]
- npm test -- catalog — passou (31/31).
- Benchmark: P95 de 340ms → 12ms (cache hit), 38ms (cache miss).
- npm run typecheck — passou.
```

#### English

```text
perf(catalog): reduce product search time with SKU caching

[CONTEXTO]
- Product search by SKU was the slowest endpoint (P95: 340ms).
- Each request queried 3 external services sequentially.
- Target: P95 below 50ms.

[ALTERAÇÕES ATÔMICAS]
- Added in-memory cache with 5-minute TTL for ProductService.findBySku.
- Parallelized queries to 3 external services (Promise.all).
- Added cache hit rate metric.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Local cache (not Redis) for simplicity — SKU is immutable, invalidation is not an issue.
- 5-min TTL is safe: catalog updates at most once per hour.
- Rejected alternative: Redis — overkill for 3 consuming services.

[VALIDAÇÃO]
- npm test -- catalog — passed (31/31).
- Benchmark: P95 from 340ms → 12ms (cache hit), 38ms (cache miss).
- npm run typecheck — passed.
```

---

### security — Correção de Segurança

#### Português

```text
security(auth): força HTTPS em redirect URI do OIDC

[CONTEXTO]
- Descoberto em auditoria de segurança (2026-Q2): redirect URI aceitava HTTP.
- Risco: token de autorização interceptável em redes não seguras.

[ALTERAÇÕES ATÔMICAS]
- Adicionada validação de protocolo no OidcService.buildRedirectUri.
- Redirecionamento HTTP retorna erro 400 com mensagem explicativa.
- Atualizados 3 testes que usavam HTTP por conveniência.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Bloquear HTTP em vez de redirecionar — falhar cedo e explicitamente.
- Alternativa rejeitada: redirect silencioso para HTTPS — esconde o problema.

[VALIDAÇÃO]
- npm test -- auth — passou (15/15).
- Teste manual: HTTP → 400, HTTPS → 302.
- npm audit — sem vulnerabilidades.
```

#### English

```text
security(auth): enforce HTTPS on OIDC redirect URI

[CONTEXTO]
- Discovered in security audit (2026-Q2): redirect URI accepted HTTP.
- Risk: authorization token interceptable on insecure networks.

[ALTERAÇÕES ATÔMICAS]
- Added protocol validation in OidcService.buildRedirectUri.
- HTTP redirect returns 400 error with explanatory message.
- Updated 3 tests that used HTTP for convenience.

[DECISÕES TÉCNICAS (Mini-ADR)]
- Block HTTP instead of silently redirecting — fail early and explicitly.
- Rejected alternative: silent redirect to HTTPS — hides the problem.

[VALIDAÇÃO]
- npm test -- auth — passed (15/15).
- Manual test: HTTP → 400, HTTPS → 302.
- npm audit — no vulnerabilities.
```

---

## Anti-Patterns

### Vague Messages (REJECT)

```text
fix: ajustes
update
wip
cleanup
mudanças finais
refactor: melhora código
fix: corrige bug
feat: adiciona feature
chore: dependencies
```

These teach the AI nothing. They contain no domain, no intent, no decision, no validation.

### Missing Domain Scope

```text
feat: adiciona validação de cupom
```

Which domain? billing? checkout? catalog? An AI searching by domain won't find this.

Fix:

```text
feat(checkout): adiciona validação de cupom antes da captura
```

### Description That Says What, Not Why

```text
feat(billing): adiciona campo taxRate na tabela invoices
```

This describes the diff (what changed in code), not the behavioral change (what the system now does differently).

Fix:

```text
feat(billing): suporta múltiplas alíquotas fiscais por fatura
```

### Subjective Validation (REJECT)

```text
[VALIDAÇÃO]
- testado manualmente
- parece funcionar
- revisão ok
- tested locally
```

Not verifiable. Not reproducible. AI works better with binary results.

Fix:

```text
[VALIDAÇÃO]
- npm test -- billing-tax — passou (14/14).
- npm run typecheck — passou.
```

Or if no automated tests exist:

```text
[VALIDAÇÃO]
- Sem testes automatizados — este repositório é um vault Obsidian sem runner.
- Conteúdo revisado manualmente.
```

### Generic Technical Decisions (REJECT)

```text
[DECISÕES TÉCNICAS (Mini-ADR)]
- Seguir boas práticas.
- Código limpo.
- Manter consistência.
```

Useless for a future agent. Must be specific to the change.

Fix:

```text
[DECISÕES TÉCNICAS (Mini-ADR)]
- Validação ocorre antes de side-effect externo (captura de pagamento).
- Alternativa rejeitada: validar após captura e estornar.
- Razão: custo operacional de estorno > custo de validação prévia.
```

### Mega-Commits (REJECT)

```text
feat: adiciona sistema de notificações completo

50 files changed, 3200 insertions, 800 deletions.
Includes: billing, orders, identity, dashboard, email, push, SMS.
```

An AI can't trace which decision affected which domain. Always split into atomic commits.

---

## Domain Scopes Guide

| Scope | When |
|-------|------|
| `auth` | Authentication, authorization, sessions, tokens, OIDC, SAML |
| `billing` | Payments, invoices, tax, pricing, Stripe integration |
| `checkout` | Cart, order placement, coupon validation |
| `catalog` | Products, SKU, inventory, categories |
| `identity` | User profiles, roles, permissions, accounts |
| `orders` | Order lifecycle, fulfillment, status transitions |
| `events` | Event bus, domain events, message schema |
| `infra` | Docker, CI/CD, deployments, configuration |
| `api` | REST/GraphQL contracts, middleware, rate limiting |
| `ui` | Components, styles, layouts, design system |
| `docs` | Documentation, ADRs, README updates |
| `ai` | Agent config, skills, prompts, harness, context |
| `test` | Test infrastructure, coverage configuration |
| `db` | Migrations, schema changes, query optimization |

---

## Analysis Commands

### Quick reconnaissance

```bash
git log --oneline -20
```

### Domain-specific history

```bash
git log --oneline --grep="billing" -20
git log --oneline --grep="auth" -20
```

### File history with intent

```bash
git log --follow --stat -- src/services/billing.ts
```

### Commit content inspection

```bash
git show <hash>
git show --stat <hash>
```

### Pattern detection

```bash
git log --oneline -- src/billing/        # all billing commits
git log --oneline --grep="fix" -- src/   # all fixes
git log --oneline --since="2026-01-01"   # recent changes
```

### Finding related commits

```bash
git log --all --oneline --grep="JIRA-321"
git log --all --oneline --grep="TaxOverride"
```

---

## Confidence Levels for Analysis

When reporting extracted patterns:

| Level | Condition |
|-------|-----------|
| HIGH | 5+ commits confirm the same pattern across different authors or time periods |
| MEDIUM | 2-4 commits show the pattern, or single author consistently |
| LOW | 1 commit suggests a pattern — needs more evidence |

Always report confidence level. Never present a single-commit observation as project-wide convention.

---

## Integration with spec-driven

When spec-driven is orchestrating a BUILD phase and this skill writes a commit:

1. Read the feature spec from `.specs/features/<name>/spec.md`
2. Read the task from `.specs/features/<name>/tasks.md`
3. Reference the task ID and spec in [CONTEXTO]
4. Match the task's acceptance criteria to the [VALIDAÇÃO] section
5. Extract design decisions from `.specs/features/<name>/design.md` for [DECISÕES TÉCNICAS]
