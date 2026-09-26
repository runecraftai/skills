---
name: linkedin-audit
description: Audita o perfil do LinkedIn (notas 0-10 em 8 seções, diagnósticos diretos, reescritas sugeridas) e gera um dashboard HTML standalone com as cores do LinkedIn. Use when the user asks for LinkedIn profile analysis or audit, "avalia meu perfil", "melhora meu LinkedIn", "audita meu LinkedIn", "dashboard do LinkedIn", or provides LinkedIn data, exported resume, profile photo or cover photo. Do NOT use for writing standalone posts, feed content, prospecting or job search without a profile analysis request.
license: CC-BY-4.0
metadata:
  author: runecraft
  version: 1.0.0
---

# LinkedIn Audit

Audita o perfil do LinkedIn do usuário contra o objetivo que ele declarar, produz um relatório de análise com notas 0-10 por seção e gera um dashboard HTML standalone (arquivo único, abre no navegador) com as cores oficiais do LinkedIn.

## Fluxo

1. **Coletar entradas** (se faltar algo, peça — nunca invente dados)
2. **Ensinar a exportar do LinkedIn** (se o usuário ainda não tem os arquivos)
3. **PARTE 1 — Análise** (notas, diagnósticos, reescritas)
4. **PARTE 2 — Dashboard HTML** (arquivo salvo em disco)
5. **Entregar** (resumo no chat + caminho do arquivo)

## Passo 1: Coletar entradas

Peça, em uma única mensagem clara:

- **Objetivo no LinkedIn** — se o usuário não declarou, pergunte com exemplos: autoridade em IA, parcerias, clientes, emprego.
- **Dados do perfil em qualquer formato** — texto colado, currículo exportado (PDF), arquivo, print ou URL. Se vier um PDF, extraia o texto antes de analisar. Se vier imagem, descreva o que conseguir ler.
- **Foto de perfil e capa (opcional, mas sempre pedir)** — arquivos ou URLs. Sem elas o dashboard funciona, mas fica mais fraco.
- **Número de seguidores** — se estiver nos dados, use; senão pergunte ou omita.

Regras de entrada: nunca invente conquistas, números ou fatos que não estejam nos dados. Toda reescrita deve manter o tom e o contexto real do usuário.

## Passo 2: Como exportar do LinkedIn (instruções para o usuário)

Se o usuário não sabe como obter os arquivos, passe estas instruções:

**Currículo exportado (mais rápido):** no perfil do LinkedIn, clique em "Mais..." → "Salvar em PDF". Isso baixa o currículo completo em PDF.

**Exportação completa de dados:** clique em "Eu" → "Configurações e privacidade" → "Privacidade de dados" → "Obter uma cópia dos seus dados" → selecione ao menos "Perfil" (e "Conta" se quiser conexões) → "Solicitar arquivo". O LinkedIn envia um ZIP por e-mail; extraia e use o conteúdo da pasta.

**Foto de perfil e capa:** clique na foto ou capa para ampliar → clique com o botão direito → "Salvar imagem como...". Prefira o arquivo original em vez de print.

## Passo 3: PARTE 1 — Análise

Avalie as 8 seções abaixo, cada uma com:

- **Nota de 0 a 10** (inteira ou com meio ponto)
- **Diagnóstico direto em 2 linhas** — o problema concreto, sem rodeios
- **Reescrita sugerida quando a nota for abaixo de 7** — mantendo o tom e o contexto real do usuário, sem inventar fatos

Seções e critérios (calibre tudo para o objetivo declarado):

1. **Foto & Banner** — qualidade da imagem, presença de rosto, coerência visual, se o banner comunica o posicionamento
2. **Headline** — clareza do posicionamento, keywords do objetivo, público-alvo reconhecível
3. **About/Resumo** — narrativa com começo/meio/fim, keywords, prova ou resultados, chamada à ação
4. **Experiências** — impacto e resultados quantificados, descrição orientada a resultados, keywords
5. **Skills** — relevância ao objetivo, ordem das mais importantes, cobertura
6. **Recomendações** — quantidade, qualidade e diversidade de autores
7. **URL** — personalizada, limpa, fácil de citar, presente no perfil
8. **Atividade** — frequência e qualidade dos posts, consistência, engajamento

Score geral: média ponderada — peso 2 para as seções mais críticas ao objetivo (emprego → Experiências e Atividade; autoridade → Atividade e About; clientes/parcerias → Headline e About) e peso 1 para as demais. Arredonde para uma casa decimal e feche com um veredito em uma frase.

Formato do relatório no chat: uma seção por bloco (nota, diagnóstico, reescrita quando aplicável), depois o score geral e as 3 prioridades mais urgentes.

## Passo 4: PARTE 2 — Dashboard HTML

Leia `references/dashboard-spec.md` e gere o arquivo HTML completo seguindo exatamente aquela especificação (cores, fontes, estrutura, radar chart, ano dinâmico). Salve o arquivo como `linkedin-dashboard.html` no diretório de trabalho atual (ou pergunte onde salvar) e confirme o caminho absoluto no chat. Se o usuário forneceu foto ou capa, converta para base64 e embuta no HTML para o arquivo ficar autocontido.

## Passo 5: Entregar

No chat, em português:

- Score geral e veredito em uma frase
- As 3 prioridades mais urgentes
- Caminho absoluto do arquivo HTML e como abrir (duplo clique ou `open <caminho>`)

## Exemplos

### Exemplo 1: usuário cola o resumo e pede avaliação

Usuário: "avalia meu LinkedIn, meu objetivo é autoridade em IA" + texto do resumo colado.
Ações: pedir foto/capa e seguidores (se faltarem) → analisar as 8 seções com notas → gerar o dashboard.
Resultado: relatório com notas no chat + `linkedin-dashboard.html` salvo.

### Exemplo 2: usuário envia só o PDF do currículo

Usuário: "meu objetivo é emprego, aqui está meu currículo exportado" + PDF.
Ações: extrair o texto do PDF → analisar com o que existe e anotar as lacunas → gerar o dashboard.
Resultado: análise honesta sobre os dados disponíveis, sem inventar.

## Troubleshooting

- **Usuário não informou o objetivo:** pergunte antes de analisar — a calibração muda notas e prioridades.
- **Dados insuficientes (ex: sem experiências, sem atividade):** pontue com base no que existe, marque a seção como "sem dados" quando não der para avaliar e diga o que pedir.
- **Só tem o PDF do currículo:** o PDF não traz foto, capa, URL personalizada nem atividade — avalie o que der e indique o que falta.
- **Radar chart não aparece:** confirme que o canvas tem altura definida no CSS e que o JS roda depois do DOM (script no fim do body ou DOMContentLoaded).
- **Fotos não abrem no navegador:** use base64 embutido em vez de caminho relativo — arquivo HTML local não carrega caminhos arbitrários de forma confiável.
