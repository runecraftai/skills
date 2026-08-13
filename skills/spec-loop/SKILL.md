---
name: spec-loop
description: |
  Drive the execution of every .specs/ artifact to completion — milestone by
  milestone, task by task, with verification gates, atomic commits and STATE.md
  progress tracking. Use when user says "execute the specs", "run the plan",
  "loop the milestones", "executar as specs", "rodar o plano", "começar a
  executar", "siga o roadmap", or when a tlc-spec-driven project has pending
  tasks.md items and the user wants autonomous execution.
license: CC-BY-4.0
metadata:
  author: runecraft
  version: 1.0.0
---

# Spec Loop

Executa todos os artefatos `.specs/` até a conclusão: ROADMAP → milestones → tasks → verificação → gates → commits atômicos → STATE.md.

## Loop principal

```
ROADMAP.md → milestones pendentes (M0..Mn)
  → tasks.md da feature → tarefa atômica
      → executar → verificar (critério "Verificar:") → commit atômico → STATE.md
  → gate do milestone (exit criteria) → próximo milestone
→ acceptance final do spec.md (Success Criteria) → projeto done
```

## Regras (ordem de prioridade)

1. **Ler antes de tocar**: ROADMAP.md (milestones), tasks.md (tarefas e dependências), design.md (tabelas de mapeamento são fonte da verdade), context.md (decisões AD-* são fechadas).
2. **Uma tarefa por vez**, na ordem do tasks.md; nunca pule uma dependência (campo "Depends on").
3. **Verificar antes de avançar**: toda tarefa tem critérios `**Verificar:**` — rode-os de fato; verificação vermelha = corrigir ou parar, nunca avançar.
4. **Commits atômicos** por tarefa concluída; mensagem com o REQ-ID/ID da tarefa quando existir.
5. **STATE.md atualizado após cada tarefa** (done/blocked + riscos novos observados).
6. **Safety valve**: se uma tarefa revelar >5 passos inesperados ou novas dependências → PARE e estenda tasks.md antes de continuar.
7. **Escalação**: blocker real → pare e reporte ao usuário com evidência; nenhuma decisão AD-* muda silenciosamente.
8. **Gates de milestone**: exit criteria do ROADMAP + grep guards (design.md §8) verdes antes de marcar o milestone como done.
9. **Escopo cirúrgico**: só arquivos da tarefa; nunca edite clones de referência, repos externos ou histórico git.
10. **Delegação opcional**: fatias mecânicas extensas → fighter/ranger; review de milestones → cleric. O loop permanece no agente principal.

## Estados

- `⬜ planned` → `▶️ in progress` → `✅ done` | `🛑 blocked` (motivo + evidência)
- Milestone done somente com exit criteria verdes.
- Projeto done somente com a acceptance final do spec.md.

## Retomada

Se interrompido: leia STATE.md + últimos commits → continue da primeira tarefa não-done. Nunca re-execute tarefas já done.

## Exemplo (Squad)

```
ROADMAP: M0 → M1 → {M2, M3} → M4 · M5 ∥ M4
1. M0: T-M0-01 (repo init) → verificar git status → commit → STATE.md
2. M0: T-M0-02..05 → gate M0 (exit criteria) → M0 ✅
3. M1: T-M1-01..12 (sweep) → full suite + grep guards → M1 ✅
...até a acceptance final de spec.md
```
