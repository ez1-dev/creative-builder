

## Status reais das OPs (E/L/A/F/C) na Auditoria Apontamento Genius

### Problema
Hoje a tela só expõe dois agrupamentos de status de OP (`EM_ANDAMENTO` = E+L+A, `FINALIZADO` = F). O backend já retorna o status nativo da `E900COP` em duas chaves por linha:
- `sitorp` — letra nativa: `E` (Emitida), `L` (Liberada), `A` (Andamento), `F` (Finalizada), `C` (Cancelada)
- `status_op` — agrupamento legado

A coluna "Status OP" da tabela já mapeia as 5 letras corretamente via `statusOpVariants`, mas filtro e KPIs não. O usuário quer ver e filtrar pelos status reais.

### Mudanças (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Render da coluna "Status OP" — priorizar `sitorp`**
- Em `buildColumns`, mudar a coluna `status_op` para ler `row.sitorp ?? v` antes de buscar em `statusOpVariants`. Garante que mesmo quando o backend manda `status_op = "EM_ANDAMENTO"` (agrupado) a tabela mostre o status real (Emitida/Liberada/Andamento) vindo de `sitorp`.

**2. Filtro "Status da OP" — 5 opções nativas + grupos**
- Substituir `statusOpOptions` por:
  ```
  E  → Emitida
  L  → Liberada
  A  → Andamento
  F  → Finalizada
  C  → Cancelada
  ──────────────
  EM_ANDAMENTO → Em andamento (E + L + A)
  FINALIZADO   → Finalizadas (F)
  SEM_STATUS   → Sem status
  ```
- O backend continua aceitando os valores; basta enviar a letra/grupo selecionada em `status_op`. Confirmar com o backend que `E/L/A/F/C` é aceito — se não, o frontend traduz `E|L|A → EM_ANDAMENTO` e `F → FINALIZADO` antes de enviar (filtra localmente o detalhamento por `sitorp`).

**3. KPIs — substituir 2 cards por 5 cards de status real**
- Trocar os cards atuais "OPs em andamento" e "OPs finalizadas" por 5 cards compactos, um por status nativo:
  - **Emitidas (E)** — variant `info`
  - **Liberadas (L)** — variant `info`
  - **Em Andamento (A)** — variant `info`
  - **Finalizadas (F)** — variant `default`
  - **Canceladas (C)** — variant `destructive`
- Cada card recebe `details` com `OP {numop} · {produto}` (top 15) das OPs únicas com aquele `sitorp`.
- Grid passa de `lg:grid-cols-9` para `lg:grid-cols-12` (1 Total Registros + 5 status + 6 discrepância) — ou agrupar visualmente em duas linhas se preferir.

**4. Agregação local (`atualizarKpisApontGenius` + `kpiDrilldowns`)**
- Trocar `opsSet` de 4 buckets fixos para um `Map<string, Set<string>>` indexado por `sitorp` (E/L/A/F/C/SEM_STATUS).
- O resumo do backend tem `total_ops_andamento` e `total_ops_finalizadas` agrupados — usar como fallback agregado quando o detalhamento por letra não estiver no resumo. Quando os 5 valores vierem só do fallback local, manter o `discrepanciasParciais = true` (alerta já existente cobre).
- `kpiDrilldowns` ganha um objeto `opsPorStatus: Record<'E'|'L'|'A'|'F'|'C', {label,value}[]>` deduplicado por `numero_op`.

**5. Drawer de detalhes**
- Já mostra `status_op`. Trocar para `row.sitorp ?? row.status_op` para exibir o real.

### Comportamento resultante
- Tabela mostra "Emitida", "Liberada", "Andamento", "Finalizada", "Cancelada" em vez de "Em andamento"/"Finalizado" genérico.
- Filtro permite escolher status nativo (E/L/A/F/C) ou agrupamento legado.
- Cinco KPIs separados por status real, cada um com drill-down das OPs daquele status.

### Fora de escopo
- Mudar backend.
- Adicionar contagem global "Canceladas" no `resumo` (depende do backend; usado fallback local).
- Drill-down navegando para tela filtrada.

### Resultado
Usuário enxerga os 5 status reais da OP (E/L/A/F/C) em filtro, KPIs e tabela, sem perder os agrupamentos legados.

