

## Garantir filtro "Status da OP" funcionando (E / L / A / F / C / agrupados / Sem status)

### Diagnóstico
Na tela `/auditoria-apontamento-genius` o `ComboboxFilter` "Status da OP" oferece 8 valores: `E`, `L`, `A`, `F`, `C`, `EM_ANDAMENTO`, `FINALIZADO`, `SEM_STATUS` (linhas 955–967). Esse valor é enviado direto ao backend em `status_op` (linhas 498 e 976).

Porém o contrato documentado em `docs/backend-auditoria-apontamento-genius.md` só prevê dois valores aceitos pelo backend: `EM_ANDAMENTO` e `FINALIZADO`. Quando o usuário escolhe **Liberada (L)**, **Emitida (E)**, **Andamento (A)**, **Cancelada (C)** ou **Sem status**, o backend tende a **ignorar** o parâmetro (cláusula SQL cai no `OR :status_op IS NULL`) e devolve **todas** as OPs ativas. Como não há refiltragem client-side, a tela mostra registros que não correspondem ao filtro escolhido.

Sintoma relatado: ao selecionar **Liberada**, a consulta retorna OPs de outros status.

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Mapear o valor enviado ao backend para o que ele aceita (sem mudar a UI)**

Criar helper `mapStatusOpParaApi(v)`:
- `''` → `'TODOS'`
- `'F'` ou `'FINALIZADO'` → `'FINALIZADO'`
- `'E'`, `'L'`, `'A'`, `'EM_ANDAMENTO'` → `'EM_ANDAMENTO'`
- `'C'` → `'TODOS'` (backend não tem chave dedicada; refiltrar no client)
- `'SEM_STATUS'` → `'TODOS'` (refiltrar no client)

Aplicar nos dois pontos que enviam `status_op`:
- `buscarAuditoriaApontamentoGenius` (linha 498)
- `exportParams` (linha 976)

**2. Refiltro client-side de garantia por letra exata / agrupamento**

Criar `useMemo` `dadosFiltradosPorStatusOp` que aplica em cima de `data?.dados` o filtro pela seleção real do usuário (`filters.status_op`), comparando contra `getOpStatusLetra(row)` (helper já existente nas linhas ~190–198). Regras:
- `''` → não filtra.
- `'E'`/`'L'`/`'A'`/`'F'`/`'C'` → mantém apenas linhas cuja letra coincide.
- `'EM_ANDAMENTO'` → mantém `E`, `L`, `A`.
- `'FINALIZADO'` → mantém `F`.
- `'SEM_STATUS'` → mantém linhas onde `getOpStatusLetra` retorna `''`.

Substituir o uso de `data?.dados` por esse array filtrado nos consumidores que renderizam grid e calculam KPIs:
- `aplicarFiltroListaApontGenius` (linha 602): trocar `data?.dados || []` por `dadosFiltradosPorStatusOp`.
- `atualizarKpisApontGenius` (linha 636): idem para `rows` (mantendo `r = data.resumo` apenas para fallback de números globais).
- `linhasDoKpi` (linha ~933+): idem na fonte `all`.
- Qualquer outro `data.dados` usado nas agregações de OPs por letra (linhas 661–675, ~781–788) deve usar o array refiltrado para refletir corretamente o recorte.

**3. Indicador visual no rodapé do `FilterPanel`**

Quando `filters.status_op` for `'C'` ou `'SEM_STATUS'`, exibir um pequeno texto `text-[11px] text-muted-foreground` dentro do `FilterPanel`: "Filtro aplicado localmente sobre a página atual — paginar para ver mais."  
Justificativa: o backend devolve TODOS, então a paginação cobre o universo total; o refiltro só restringe o que é exibido por página. Não é ideal, mas evita confusão.

**4. Atualizar contadores de "página atual" para refletirem o refiltro**

`paginaCarregada` usado nos KPIs deve passar a ser `dadosFiltradosPorStatusOp.length` (em vez de `data.dados.length`) para que o aviso "X de Y" continue coerente.

### Detalhes técnicos
- Sem mudanças em backend, contrato ou migrations.
- Helper `getOpStatusLetra` já existe no arquivo (~linha 190) — apenas reutilizar.
- Refiltro é puro `Array.filter` em memória, sem custo perceptível.
- Mantém compatibilidade caso o backend passe a aceitar letras nativas (a função client continua válida e converge).

### Fora de escopo
- Mudar o backend para aceitar `E/L/A/C/SEM_STATUS` (será rastreado em doc separada se necessário).
- Alterar o `ComboboxFilter` ou as opções exibidas.
- Mexer em outros filtros (`somente_discrepancia`, `somente_acima_8h`, datas, etc.).

### Resultado
- Selecionar **Liberada (L)** passa a exibir apenas OPs com `sitorp = 'L'` no grid e nos KPIs.
- O mesmo vale para `E`, `A`, `C` e `SEM_STATUS` — antes ignorados pelo backend.
- `EM_ANDAMENTO` e `FINALIZADO` continuam funcionando como hoje (agora reforçados pelo client-side).
- Aviso opcional informa quando o filtro é client-side, evitando interpretação errada da paginação.

