
## Padronização de filtros nas páginas de RH

Uniformizar as 6 páginas (`Resumo Folha`, `Quadro Colaboradores`, `Contratos de Experiência`, `Programação de Férias`, `Turnover`, `Absenteísmo`) para que os filtros sejam **aplicados automaticamente ao mudar** e para que **período** e **empresa (codemp)** existam em todas.

### 1. Componente compartilhado de filtros
Criar `src/components/rh/RhFiltrosBar.tsx`:
- Campos: **Mês inicial**, **Mês final** (`AnomesSelect`) e **Empresa** (`Input` numérico, padrão `1` — mesmo padrão hoje usado no Resumo Folha).
- Props opcionais: `mostrarPeriodo`, `mostrarEmpresa`, `mostrarDataRef` (para Quadro Colaboradores), `extras` (slot p/ campos específicos).
- Sem botão "Atualizar" — cada mudança dispara `onChange` que atualiza o estado da página e refaz as queries via React Query.
- Debounce leve (≈400 ms) apenas no campo `codemp` (texto livre) para evitar chamadas a cada tecla.

### 2. Comportamento por página

| Página | Filtros expostos | Mudança na página |
|---|---|---|
| Resumo Folha | período + empresa | Substituir bloco de filtros atual pelo `RhFiltrosBar`; comportamento continua automático |
| Quadro Colaboradores | data ref + período histórico + empresa | Adicionar seletor de empresa; usar `RhFiltrosBar` com `mostrarDataRef` |
| **Contratos de Experiência** | período + empresa | **NOVO**: adicionar filtros; aplicar `anomes_ini/fim` **client-side** sobre `vencimentos[]` (filtra por `dt_fim_experiencia`) e recalcula os KPIs derivados a partir da lista filtrada. `codemp` passa como parâmetro real da API |
| **Programação de Férias** | período + empresa | **NOVO**: adicionar filtros; aplicar `anomes_ini/fim` **client-side** sobre `limite_ferias_pivot` e sobre a lista de programação (filtra por período de gozo/limite) e recalcula KPIs. `codemp` vai à API |
| Turnover | período + empresa | Remover `iniDraft/fimDraft` e o botão **Atualizar**; ligar `AnomesSelect` direto ao estado `ini/fim`. Trocar `const codemp = 1` por estado |
| Absenteísmo | período + empresa | Mesma mudança do Turnover |

Observação sobre backend: os endpoints `/api/rh/contrato-experiencia/dashboard` e `/api/rh/programacao-ferias/dashboard` hoje só aceitam `codemp`. Como o backend FastAPI é externo e fora do escopo desta iteração, o filtro de período nessas duas páginas será feito **no frontend** (após receber o dataset completo). Fica registrado como melhoria futura passar `anomes_ini/fim` também para a API para reduzir payload.

### 3. Reatividade a todos os blocos da página
Garantir que, ao mudar qualquer filtro:
- A `queryKey` do React Query inclui todos os filtros (já é o caso em quase todas — só falta em Contratos/Férias após a adição de período).
- Todos os KPIs, tabelas, gráficos, drills e o payload enviado ao **Relatório PDF (IA)** (`filtros`, `iaPayload`, `carregarAnterior`) usam os mesmos estados de filtro.
- O botão "Relatório PDF (IA)" e o export Excel passam a receber `codemp` do estado (não mais chumbado).

### 4. Detalhes técnicos
- Não altera schema do backend nem tabelas do Lovable Cloud.
- Não altera `pdfStyles`, `ModuloPdf`, nem `BotaoRelatorioModuloPdf` — só as props `filtros` continuam vindo do estado.
- Reaproveita `AnomesSelect` de `@/components/bi/comercial/AnomesSelect`.
- Para Contratos/Férias: criar helpers `filtrarContratosPorPeriodo(dashboard, ini, fim)` e `filtrarFeriasPorPeriodo(dashboard, ini, fim)` em `src/lib/rh/filtros.ts` para manter as páginas enxutas e evitar duplicação com a lógica de PDF.

### 5. Arquivos afetados
- Novos: `src/components/rh/RhFiltrosBar.tsx`, `src/lib/rh/filtros.ts`
- Editados: as 6 páginas em `src/pages/rh/`

Nenhuma migração de banco é necessária.
