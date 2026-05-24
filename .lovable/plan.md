## Visão geral

Novo módulo **Produção > Programação e Sequenciamento** em `/producao/programacao`, com 5 abas. Frontend **só consome a API** — nenhum cálculo local, nenhum acesso direto a tabelas. Reaproveita 100% do padrão do módulo Carga (api client, react-query, GroupByBar, badges, CargaFiltersBar style).

## Arquitetura

```
src/lib/producao/programacaoApi.ts         ← tipos + chamadas
src/hooks/useProgramacao.ts                ← react-query wrappers
src/pages/producao/ProgramacaoPage.tsx     ← shell com 5 Tabs + KPIs no topo
src/components/producao/programacao/
  ├── ProgramacaoKpis.tsx                  ← 7 KPIs compartilhados
  ├── FilaOpsTab.tsx
  ├── GerarProgramacaoTab.tsx
  ├── AgendaRecursoTab.tsx
  ├── MapaGargalosTab.tsx
  └── CapacidadesTab.tsx
```

## Tipos (`programacaoApi.ts`)

```ts
export type StatusProgramacao = 'PROGRAMADO' | 'EXECUTANDO' | 'CONCLUIDO' | 'CANCELADO';
export type StatusGargalo = 'OK' | 'ATENCAO' | 'GARGALO' | 'SEM_PARAMETRO';

export interface FilaOp {
  unidade_negocio: string; codcre: string; descre: string;
  codori: string; numorp: string | number;
  codpro: string; descricao_produto: string;
  codopr: string; descricao_operacao: string;
  quantidade_prevista: number;
  tempo_previsto_min: number; tempo_previsto_horas: number;
  prioridade: number; data_geracao_op: string | null;
}

export interface GerarProgramacaoPayload {
  data_ini?: string; data_fim?: string; data_inicio_programacao?: string;
  situacoes?: string; // default 'A,L'
  unidade_negocio?: string; codcre?: string;
  permitir_quebra_operacao?: boolean; limpar_anterior?: boolean;
}
export interface GerarProgramacaoResponse {
  lote_programacao: string;
  qtd_operacoes_fila: number;
  qtd_linhas_programadas: number;
  qtd_sem_capacidade: number;
  qtd_sem_saldo: number;
  recursos_sem_capacidade: { codcre: string; descre: string }[];
}

export interface AgendaLinha {
  data_programada: string; dia_semana: string;
  hora_inicio: string; hora_fim: string;
  codcre: string; descre: string;
  codori: string; numorp: string | number;
  codpro: string; codopr: string;
  tempo_alocado_min: number;
  segmento: number | string;
  status_programacao: StatusProgramacao;
  lote_programacao?: string;
}

export interface GargaloDia {
  data: string; dia_semana: string;
  unidade_negocio: string; codcre: string; descre: string;
  carga_programada_horas: number;
  capacidade_disponivel_horas: number;
  ocupacao_perc: number;
  status: StatusGargalo;
}

export interface Capacidade {
  codemp: number; codcre: string; descre?: string;
  minutos_dia: number; qtde_recursos: number; eficiencia_perc: number;
  hora_inicio: string;
  considerar_sabado: boolean; considerar_domingo: boolean;
  ativo: boolean; obs?: string;
}
```

Métodos `programacaoApi`: `fila(f)`, `gerar(p)`, `agenda(f)`, `gargalos(f)`, `capacidades()`, `salvarCapacidades(rows)`.

## Hooks (`useProgramacao.ts`)

- `useFilaOps(f)`, `useAgenda(f)`, `useGargalos(f)`, `useCapacidades()` → `useQuery` (`staleTime 30s`).
- `useGerarProgramacao()` → `useMutation` que invalida `['programacao','agenda']` e `['programacao','gargalos']` no sucesso.
- `useSalvarCapacidades()` → `useMutation` que invalida `['programacao','capacidades']`.

## UI por aba

Filtros compartilhados num pequeno `ProgramacaoFiltersBar` (data_ini, data_fim, unidade_negocio, tipo_recurso, codcre, status). Estado em `useState<ProgramacaoFiltros>` no `ProgramacaoPage` e KPIs em cima.

### 1. Fila de OPs (`FilaOpsTab`)
Tabela com as 14 colunas pedidas, com `GroupByBar` (unidade, tipo, recurso), busca local por número OP/produto, ordenação por prioridade desc e tempo desc.

### 2. Gerar Programação (`GerarProgramacaoTab`)
Form (react-hook-form + zod):
- Datas (shadcn DatePicker com `pointer-events-auto`).
- Situações: multi-select (default `A,L`).
- Unidade negócio, Centro de recurso (selects).
- Switches: permitir quebra, limpar anterior.
- Botão "Gerar Programação" → `useGerarProgramacaoMutation`.
- Painel de resultado pós-execução com os 5 contadores + lista expandível de recursos sem capacidade.
- Toast de sucesso/erro.

### 3. Agenda por Recurso (`AgendaRecursoTab`)
Filtros (data ini/fim, unidade, tipo, recurso, status, lote). Duas visões em sub-tabs:
- **Tabela**: 12 colunas, agrupada por `codcre` (usar GroupByBar existente).
- **Calendário**: grid simples Recurso × Dia (linhas = recursos, colunas = dias do range, cada célula com lista de OPs e barra de ocupação). Sem libs novas — renderização própria em CSS grid.

### 4. Mapa de Gargalos (`MapaGargalosTab`)
- Cabeçalho com 4 KPIs (gargalos, atenção, ok, sem parâmetro).
- **Heatmap** Recurso × Dia colorindo por ocupação:
  - `>100%` → `bg-destructive/80 text-destructive-foreground` (GARGALO)
  - `80–100%` → `bg-warning/70` (ATENCAO) — uso tokens semânticos
  - `<80%` → `bg-emerald-500/40` (OK)
  - `SEM_PARAMETRO` → `bg-muted` com hachura/diagonal
  - Hover mostra: data, dia semana, carga programada, capacidade, ocupação%, status.
- Tabela detalhada abaixo (todas as colunas pedidas), com filtro "só gargalo/atenção".

### 5. Capacidade dos Recursos (`CapacidadesTab`)
Tabela editável inline:
- Carregar via `useCapacidades`.
- Editar célula a célula (`Input` numérico, `Switch` para flags, `Input time` para hora_inicio).
- Botão "Salvar alterações" em batch → `POST /capacidades` com array.
- Botão "+ Adicionar recurso" abre `Dialog` para incluir uma nova linha.
- Diff highlight nas linhas modificadas; reset opcional.

## KPIs do módulo (`ProgramacaoKpis`)
7 cards no topo do `ProgramacaoPage`, derivados das queries:
1. OPs na fila (`fila.length`)
2. Tempo total previsto (soma `tempo_previsto_horas`)
3. Tempo programado (soma `tempo_alocado_min/60`)
4. Capacidade disponível (soma `capacidade_disponivel_horas` no range)
5. Ocupação média % (média ponderada)
6. Quantidade de gargalos (`status === 'GARGALO'`)
7. Recursos sem capacidade (`status === 'SEM_PARAMETRO'`)

## Integração

- **`App.tsx`**: rota `/producao/programacao` com `<ProtectedRoute path="/producao/programacao">`.
- **`AppSidebar.tsx`**: novo item em Produção → "Programação e Sequenciamento" (icon `CalendarClock`).
- **`screenCatalog.ts`**: `'/producao/programacao': { codigo: 'PROD_PROGRAMACAO', nome: 'Programação e Sequenciamento' }`.

## Não escopo

- Edição/drag-and-drop de blocos na agenda (só visualização nesta primeira versão).
- Otimizador local — todo cálculo é do backend.
- Exportação CSV/PDF — pode entrar depois.
- Realtime (refetch manual / invalidate após `gerar`).

## Arquivos a criar/editar

**Novos**
- `src/lib/producao/programacaoApi.ts`
- `src/hooks/useProgramacao.ts`
- `src/pages/producao/ProgramacaoPage.tsx`
- `src/components/producao/programacao/ProgramacaoKpis.tsx`
- `src/components/producao/programacao/ProgramacaoFiltersBar.tsx`
- `src/components/producao/programacao/FilaOpsTab.tsx`
- `src/components/producao/programacao/GerarProgramacaoTab.tsx`
- `src/components/producao/programacao/AgendaRecursoTab.tsx`
- `src/components/producao/programacao/MapaGargalosTab.tsx`
- `src/components/producao/programacao/CapacidadesTab.tsx`

**Editados**
- `src/App.tsx` — rota.
- `src/components/AppSidebar.tsx` — item de menu.
- `src/lib/screenCatalog.ts` — registro.