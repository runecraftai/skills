# Especificação do dashboard HTML do LinkedIn Audit

Gere UM arquivo HTML completo, standalone: CSS e JS inline, sem bibliotecas externas. Única exceção: fontes Google (Inter + DM Mono). O arquivo deve abrir direto no navegador via `file://` sem erros.

## Paleta (usar exatamente estes valores)

- Azul principal: `#0A66C2`
- Azul escuro: `#004182`
- Fundo claro: `#F3F2EF`
- Superfície branca: `#FFFFFF`
- Texto principal: `#1C1C1C`
- Texto secundário: `#666666`
- Verde (notas ≥ 8): `#057642`
- Amarelo (notas 5–7): `#E8A400`
- Vermelho (notas < 5): `#CC1016`

Faixas de cor da nota na lógica JS: `nota >= 8 ? verde : nota >= 5 ? amarelo : vermelho`.

## Fontes

Google Fonts: `Inter` (texto) + `DM Mono` (números, notas e destaques). Inclua o `<link>` no head com fallback `sans-serif` / `monospace`.

## Estrutura obrigatória

1. **Header** — nome do usuário, objetivo declarado e número de seguidores; foto de perfil quando fornecida (embutida em base64, redonda); o ano atual gerado dinamicamente com `new Date().getFullYear()` — NUNCA ano fixo no código.
2. **Banner de score geral** — nota em um círculo (cor conforme a faixa) e veredito em uma frase.
3. **Grid de cards, um por seção (8)** — cada card com:
   - Nome da seção + ícone emoji
   - Nota colorida conforme a faixa
   - Barra de progresso animada na cor correspondente (anima de 0 até a nota ao carregar, via CSS transition ou animação JS)
   - Diagnóstico curto
   - Box "Reescrita sugerida" com borda esquerda azul `#0A66C2` — SOMENTE quando a nota < 7
4. **Radar chart (canvas)** — com as 8 dimensões, desenhado em JS puro (sem bibliotecas): eixos, grades, polígono preenchido com leve transparência, rótulos das dimensões e valores das notas. O canvas precisa de altura definida (ex: 320–380px) para renderizar.
5. **Footer** — as 3 prioridades mais urgentes em destaque.

## Regras de implementação

- Título da aba: `LinkedIn Audit — <nome>`.
- Layout responsivo: grid com `auto-fit minmax(280px, 1fr)` ou equivalente; header empilha em telas estreitas.
- Radar chart: normalizar notas para o raio (0–10 → 0–100%); desenhar com `Math.cos`/`Math.sin`; fundo `#FFFFFF`, grade e texto em `#666666`, polígono em `#0A66C2` com preenchimento `rgba(10,102,194,0.25)`.
- Imagens (foto de perfil, capa): base64 embutido; sem imagens, omitir o elemento sem quebrar o layout.
- Não usar ano fixo em lugar nenhum do HTML/JS.
- Todo o conteúdo (nomes, notas, diagnósticos, reescritas, prioridades) vem da análise do Passo 3 da SKILL.md — nunca gere conteúdo aleatório ou inventado.
