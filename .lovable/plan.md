# APS + IA Planejadora de Produção

Evoluir o módulo `/producao/programacao` de "painel de carga" para um **APS (Advanced Planning & Scheduling)** com camada de IA interpretativa por cima. Tudo 100% no Lovable Cloud — sem dependência do FastAPI.

## Princípio arquitetural

```
Motor APS (determinístico)  →  calcula datas, capacidade, gargalos, cenários
        ↓
Camada IA (interpretativa)   →  explica riscos, recomenda ações, responde NL
        ↓
PCP (humano)                 →  valida e aprova
```

A IA **nunca** inventa a programação. Ela só lê o resultado do motor e interpreta.

---

## Entregas em 4 fases

### Fase 1 — Base de dados (Cloud)

Duas tabelas novas + extensão do que já existe:

**`producao_entrega_programada`** — data de entrega informada pelo PCP (por OP, obra, projeto ou produto)
- `codemp`, `tipo_entrega` (OP / OBRA / PROJETO / PRODUTO), `numorp`, `numprj`, `codori`, `codpro`
- `data_entrega`, `prioridade`, `cliente`, `obra`, `observacao`, `ativo`
- RLS: read `authenticated`, CRUD para admins + perfil PCP

**`producao_leadtime_etapa`** — parametrização de lead time/folga por etapa
- `codemp`, `codcre`, `codopr`, `unidade_negocio`, `tipo_recurso`
- `leadtime_fixo_dias`, `folga_seguranca_dias`, `considerar_no_calculo`, `ativo`, `obs`
- RLS: read `authenticated`, CRUD para admins

Reaproveita `bi_ops_fila`, `programacao_capacidades`, `programacao_agenda`.

---

### Fase 2 — Motor APS (Edge Function)

**Edge function `programacao-simular-cenario`** — substitui/estende `programacao-gerar`.

Suporta:
- **Programação progressiva** (forward): a partir de hoje, distribui OPs por capacidade até chegar na data prevista de conclusão.
- **Programação regressiva** (backward): a partir da `data_entrega`, recua etapa por etapa respeitando sequência de roteiro e calcula data mínima de início.
- **Simulação de N cenários** em uma única chamada (base, +sábado, +recurso extra, +hora extra, terceirização, mudança de prioridade).
- Cálculo de **ocupação % por centro/dia** e identificação do **gargalo principal**.

**Payload** (resumo):
```json
{
  "codemp": 1,
  "tipo_planejamento": "OBRA" | "OP" | "PROJETO",
  "numprj": 663,
  "data_entrega": "2026-06-20",
  "modo": "REGRESSIVO" | "PROGRESSIVO" | "AMBOS",
  "considerar_sabado": false,
  "considerar_domingo": false,
  "simulacoes": [
    { "nome": "Base atual" },
    { "nome": "Com sábado", "considerar_sabado": true },
    { "nome": "+1 soldador", "ajustes_capacidade": [{ "codcre": "2150", "qtde_recursos_extra": 1 }] }
  ]
}
```

**Resposta** (resumo):
```json
{
  "cenarios": [
    {
      "nome": "Base atual",
      "resumo": {
        "data_entrega": "2026-06-20",
        "data_conclusao_prevista": "2026-06-24",
        "dias_atraso": 4,
        "risco": "ALTO",
        "centro_gargalo_principal": "2150 - G-SOLDA GERAL"
      },
      "etapas": [ { "sequencia": 10, "codcre": "2100", "data_inicio_sugerida": "...", "data_fim_sugerida": "...", "carga_horas": 12.5, "ocupacao_percentual": 78 } ],
      "ocupacao_por_centro_dia": [ ... ]
    }
  ]
}
```

Resultado opcionalmente persistido em `programacao_agenda` (com `lote_programacao` por cenário) para visualização.

---

### Fase 3 — Camada IA interpretativa

**Edge function `planejamento-ia-analisar`** — recebe o JSON de cenários do motor e chama Lovable AI (`google/gemini-2.5-flash` por padrão, `gemini-2.5-pro` para análises grandes).

Retorna:
- **Risco** (BAIXO / MÉDIO / ALTO) com justificativa
- **Recomendações acionáveis** (lista priorizada)
- **Comparativo de cenários** em linguagem natural
- **Próximas ações sugeridas** (ex: "antecipar OP X", "abrir hora extra na solda na semana 24")

A IA recebe apenas dados calculados (números, datas, ocupações). Nunca inventa OPs ou capacidades.

---

### Fase 4 — IA assistente (chat NL)

**Edge function `planejamento-ia-chat`** — chat com tool-calling. Tools disponíveis ao modelo:
- `consultar_entregas_programadas(filtros)`
- `simular_cenario(payload)` → chama o motor APS
- `analisar_cenario(resultado)` → chama a camada interpretativa
- `consultar_gargalos(periodo)`
- `consultar_ocupacao_centro(codcre, periodo)`

Permite perguntas como:
- "Consigo entregar a obra 663 até 20/06?"
- "Se eu colocar mais 1 soldador, reduz quantos dias?"
- "Monte o melhor cenário para entregar sem trabalhar sábado."

Histórico do chat persistido (tabela `planejamento_ia_conversas` + `planejamento_ia_mensagens`) por usuário.

---

## UI — Novas telas/abas

Dentro de `/producao/programacao`, adicionar abas:

1. **Entregas Programadas** — CRUD de `producao_entrega_programada` (PCP cadastra prazos).
2. **Lead Times** — CRUD de `producao_leadtime_etapa` (parametrização por etapa).
3. **Cenários** — formulário de simulação multi-cenário + tabela comparativa (data prevista, atraso, risco, gargalo) + Gantt por cenário.
4. **IA Planejadora** — chat com a IA (perguntas em linguagem natural + cards de recomendação).

Reaproveita componentes existentes (`ProgramacaoFiltersBar`, `ProgramacaoKpis`, tabelas).

---

## Detalhes técnicos

- **Stack:** React + Vite + Tailwind + shadcn; Edge Functions Deno; Lovable Cloud (Supabase).
- **AI:** Lovable AI Gateway (`LOVABLE_API_KEY` já disponível). Sem custo de chave para o usuário.
- **Algoritmo regressivo:** parte de `data_entrega`, percorre roteiro em ordem inversa (`sequencia DESC`), aloca tempo previsto descontando dias úteis + capacidade do centro, soma `leadtime_fixo_dias` + `folga_seguranca_dias` da parametrização.
- **Algoritmo progressivo:** mesmo loop existente em `programacao-gerar`, expandido para gerar `ocupacao_por_centro_dia` e detectar gargalo (centro com maior % médio de ocupação no horizonte da OP).
- **Roteiro:** virá de `bi_ops_fila` (uma linha por operação, ordenada por `codopr`/sequência). Já temos `tempo_previsto_min`, `codcre`, `codopr`.
- **Cache:** resultado de cenário pode ser gravado em `dashboard_cache` (TTL curto) para acelerar reabertura.
- **Segurança:** todas as edge functions validam JWT via `getClaims`. RLS em todas as tabelas novas.

---

## Ordem de implementação sugerida

1. Migration: `producao_entrega_programada` + `producao_leadtime_etapa` + RLS.
2. UI: abas "Entregas Programadas" e "Lead Times" (CRUD simples) — desbloqueia o PCP a cadastrar dados reais.
3. Edge function `programacao-simular-cenario` (progressivo + regressivo + multi-cenário).
4. UI: aba "Cenários" com tabela comparativa e Gantt.
5. Edge function `planejamento-ia-analisar` + cards de recomendação na aba Cenários.
6. Edge function `planejamento-ia-chat` + UI da aba "IA Planejadora".

Cada fase é entregável independentemente — você valida antes de passar para a próxima.

---

## Fora de escopo desta plana

- Apontamentos reais (E900EOQ) — usaremos só `tempo_previsto_min` por enquanto.
- Disponibilidade de material (MRP) — fica para fase futura.
- Otimização real (sequenciamento por setup/troca de ferramenta) — continua sendo FIFO por prioridade.
- Integração com pedido de venda para puxar `data_entrega` automaticamente — manual via UI no MVP.

---

**Pergunta antes de partir para build:** começo pela **Fase 1 + 2 completas** (base + motor APS funcionando com cenários) numa única implementação, ou prefere fatiar e validar **só Fase 1 (tabelas + CRUDs)** primeiro?