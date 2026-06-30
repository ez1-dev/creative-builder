## Objetivo
Corrigir a tela `01 - Resumo Folha` para consumir o endpoint agregado `GET /api/rh/resumo-folha/dashboard` (KPIs e tabelas resumidas vêm prontos do backend), mantendo `GET /api/rh/resumo-folha` apenas como fonte detalhada opcional. Garantir formato `anomes = YYYYMM` e usar o cliente `api` autenticado.

## Mudanças

### 1. `src/lib/rh/types.ts`
Adicionar tipo `ResumoFolhaDashboard`:

```ts
export interface ResumoFolhaKpis {
  provento: number; desconto: number; total_liquido: number;
  custo_total: number; beneficios: number; inss_total: number;
  hora_extra: number; provisoes: number; custo_ferias: number;
  rescisoes: number; fgts: number;
}
export interface ResumoFolhaEventoAgg { codigo?: string; descricao?: string; valor: number; }
export interface ResumoFolhaFilialAgg {
  filial: string; salario_base?: number; custo_total?: number;
  qtd_horas?: number; custo_hora_extra?: number; qtd_hora_extra?: number;
  liquido?: number; fgts?: number; beneficios?: number;
  inss?: number; custo_ferias?: number; provisoes?: number;
}
export interface ResumoFolhaTipoEventoAgg { tipo: string; valor: number; }
export interface ResumoFolhaMensalAgg { competencia: string; custo_hora_extra?: number; custo_mensal?: number; }

export interface ResumoFolhaDashboard {
  kpis: ResumoFolhaKpis;
  proventos_vantagens: ResumoFolhaEventoAgg[];
  descontos: ResumoFolhaEventoAgg[];
  filiais: ResumoFolhaFilialAgg[];
  tipos_evento: ResumoFolhaTipoEventoAgg[];
  mensal?: ResumoFolhaMensalAgg[];
}
```

### 2. `src/lib/rh/api.ts`
- Nova função `fetchResumoFolhaDashboard(p)` que chama `api.get("/api/rh/resumo-folha/dashboard", { anomes_ini, anomes_fim, filial?, matricula? })` (já passa pelo `api` autenticado / Bearer Token).
- Detectar endpoint inexistente: se a chamada lançar com status 404 (ou erro de rota), relançar com `{ code: "DASHBOARD_INDISPONIVEL" }` para a tela tratar.
- Garantir que `anomes_ini/anomes_fim` recebidos cheguem como `YYYYMM` puro (helper `toAnomes` removendo `-`, `/`, espaços; truncando para 6 dígitos). Se vier vazio, não enviar.
- Manter `fetchResumoFolha` para drill detalhado.

### 3. `src/pages/rh/ResumoFolhaPage.tsx`
- Substituir o `useQuery` principal por `fetchResumoFolhaDashboard`.
- Helper `toAnomes("2026-01") => "202601"` aplicado nos filtros antes de enviar.
- Remover toda a agregação local (`somarBucket`, `groupBy`, `classifyEvento` para KPIs/filial/tipos). A página passa a renderizar diretamente:
  - **Card Líquido** → `kpis.provento`, `kpis.desconto`, `kpis.total_liquido`
  - **Custo Total** → `kpis.custo_total`
  - **Benefícios** → `kpis.beneficios`
  - **INSS Total** → `kpis.inss_total`
  - **Hora Extra** → `kpis.hora_extra`
  - **Provisões** → `kpis.provisoes`
  - **Custo das Férias** → `kpis.custo_ferias`
  - **Rescisões** → `kpis.rescisoes`
  - **FGTS** → `kpis.fgts`
  - **Tabela Proventos + Vantagens** → `proventos_vantagens[]`
  - **Tabela Descontos** → `descontos[]`
  - **Tabela Filial** → `filiais[]`
  - **Donut Tipos de Evento** → `tipos_evento[]`
  - **Gráficos mensais** → `mensal[]` quando presente (caso contrário, ocultar).
- Filtro de Filial: alimentado a partir de `filiais[].filial`.
- Filtro de matrícula/colaborador: enviado como `matricula` ao dashboard (e o backend filtra).
- **Aviso quando endpoint não existe**: ao detectar `DASHBOARD_INDISPONIVEL` (ou 404), mostrar banner destacado: *"Endpoint de dashboard da folha ainda não disponível."* e ocultar cards/tabelas (não exibir zeros).
- Manter loading skeleton; remover banner antigo de "valores zerados".

### 4. Documentação
Criar `docs/backend-rh-resumo-folha-dashboard.md` descrevendo o contrato esperado (URL, parâmetros `anomes_ini/anomes_fim` no formato `YYYYMM`, schema da resposta com `kpis`, `proventos_vantagens`, `descontos`, `filiais`, `tipos_evento`, `mensal`).

## Fora de escopo
- Alterações nas demais telas RH.
- Alterações no `api.ts` (Bearer Token já é injetado pelo cliente compartilhado).
