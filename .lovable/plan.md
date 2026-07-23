## Diagnóstico

**1. Texto truncado ("...frente ao E")**
O corte no meio da palavra é característico de limite de tokens do modelo no backend (a rota `/api/contabil/indicadores/analise/stream` fecha o SSE quando o LLM atinge `max_tokens`). O frontend consome o stream corretamente (buffer + `split('\n\n')` + flush do resto no `finally`), então a causa não é parser client-side. **Confirmação pendente** — só a resposta real do backend pode fechar o diagnóstico; por isso o plano inclui checagem e um caminho de mitigação no cliente.

**2. Layout pobre da narrativa**
Hoje é `prose prose-sm max-w-3xl` num container `max-w-[1600px]`. Como o backend devolve o texto sem `##`/`**` em alguns pontos (títulos "Resumo", "Rentabilidade" saem como linha simples), o `ReactMarkdown` não estiliza seções e o bloco fica um paredão único, estreito e cinza.

## Alterações

### A. Backend (arquivo de spec para o time da API)
Criar `docs/backend-contabil-indicadores-analise-truncamento.md` pedindo:
- Aumentar `max_tokens` da análise (hoje aparentemente ~1500) para no mínimo `4096`.
- Emitir `event: done` com `finish_reason` (`stop` | `length`) para o front detectar corte.
- Opcional: aceitar `?continuar=1&depois_de=<hash>` para gerar continuação.

### B. Frontend — `src/pages/contabilidade/IndicadoresContabeisPage.tsx`
Melhorar o painel "Análise (IA)":
- Container mais largo e legível: trocar `max-w-3xl` por `max-w-[900px]` com `columns` desabilitado, `leading-relaxed`, `text-[13.5px]`.
- Pré-processar a narrativa antes de passar ao `ReactMarkdown`:
  - Detectar linhas curtas em negrito ou títulos conhecidos ("Resumo", "Rentabilidade", "Liquidez", "Endividamento", "Capital de giro", "Riscos", "Recomendações") e prefixar `## ` para virarem headings visuais.
  - Quebrar parágrafos longos em `\n\n` quando encontrar sentenças coladas com `. `.
- Estilo shadcn (via classes utilitárias, sem cor hardcoded):
  - `h2` (### seção): borda inferior sutil, cor `text-primary`, `text-sm uppercase tracking-wider`.
  - `strong`: `text-foreground font-semibold`.
  - Realces monetários (regex `R\$\s*-?[\d\.,]+`) envoltos em `<span class="tabular-nums font-medium">` via `components.p` custom do ReactMarkdown.
  - Listas com marcadores azuis (`marker:text-primary`).
- Cabeçalho do card ganha metadados: período analisado, modelo, contagem de caracteres recebidos.

### C. Frontend — detector de truncamento
Em `src/lib/contabil/indicadoresApi.ts`:
- Propagar `finish_reason` no `onDone` (`AnaliseStreamHandlers`).
- Considerar truncado quando: `finish_reason === 'length'` **ou** heurística — texto não termina com `.`, `!`, `?`, `)`, `"` e o último token não é palavra completa (última "palavra" com <3 chars após espaço ou sem pontuação final).

Na página, quando truncado:
- Banner `Alert` amarelo "Resposta cortada pelo limite do modelo".
- Botão "Continuar análise" que reabre o stream (chama backend com flag; enquanto o backend não suporta, apenas re-gera).

### D. PDF
`src/lib/contabil/indicadoresRelatorio.ts` já recebe `narrativa` — aplicar o mesmo pré-processamento de títulos antes do `splitTextToSize` para o PDF acompanhar o novo layout.

## Fora de escopo
- Alterar cálculo/agrupamento dos indicadores.
- Trocar o modelo de IA usado no backend.
- Persistir análise (continua por sessão).

## Detalhes técnicos

```text
Fluxo do stream (após mudanças)
 backend SSE ──► streamIndicadoresAnalise
     event: meta   → { modelo, periodo }
     event: delta  → { text }
     event: done   → { chars, finish_reason }   ◄─ NOVO campo
     event: erro   → { erro }
 UI:
   narrativaStream (append)
   finishReason  ─► trunc? → Alert + botão Continuar
   narrativa pré-processada → ReactMarkdown estilizado
```
