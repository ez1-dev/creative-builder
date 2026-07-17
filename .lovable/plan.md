## Objetivo

Migrar `src/pages/producao/ProducaoDashboardPage.tsx` para consumir o novo agregador `GET /api/producao/visao-geral`, com carga lazy da seção "Carga" e fallback temporário para `/api/producao/dashboard` enquanto o novo endpoint não estiver publicado. Nenhuma alteração de backend, banco ou lógica de cálculo.

## 1. Tipos e client (`src/lib/producao/visaoGeralApi.ts` — novo)

```ts
export type ProducaoResumo = {
  kg_produzido?: number | null;
  kg_expedido?: number | null;
  kg_patio?: number | null;
  kg_engenharia?: number | null;
  itens_nao_carregados?: number | null;
  leadtime_medio_total?: number | null;
  leadtime_medio_engenharia?: number | null;
  leadtime_medio_producao?: number | null;
  leadtime_medio_engenharia_producao?: number | null;
  leadtime_medio_producao_expedicao?: number | null;
  quantidade_cargas?: number | null;
  projetos_aguardando_producao?: number | null;
  projetos_em_producao?: number | null;
  projetos_parcialmente_expedidos?: number | null;
  projetos_expedidos?: number | null;
};

export type CargaResumo = {
  ocupacao_media_percentual?: number | null;
  qtd_gargalos?: number | null;
  obras_em_producao?: number | null;
};

export type ProducaoVisaoGeralResponse = {
  producao?: ProducaoResumo;
  top_projetos_patio?: Array<Record<string, any>>;
  cargas_por_mes?: Array<Record<string, any>>;
  carga?: CargaResumo | null;
};

export type ProducaoFiltros = {
  numero_projeto?: string;
  numero_desenho?: string;
  revisao?: string;
  cliente?: string;
  cidade?: string;
  data_ini?: string;
  data_fim?: string;
  situacoes?: string;
  unidade_negocio?: string;
  tipo_recurso?: string;
};

function buildParams(f: ProducaoFiltros, incluirCarga: boolean) { /* omite vazios; adiciona incluir_carga=true quando pedido */ }

export async function fetchProducaoVisaoGeral(f: ProducaoFiltros, incluirCarga: boolean): Promise<ProducaoVisaoGeralResponse> {
  try {
    return await api.get('/api/producao/visao-geral', buildParams(f, incluirCarga));
  } catch (e: any) {
    if (e?.statusCode === 404) {
      console.warn('[producao] /visao-geral 404 — fallback para /dashboard (transição)');
      const legacy = await api.get('/api/producao/dashboard', f);
      return {
        producao: legacy?.resumo ?? undefined,
        top_projetos_patio: Array.isArray(legacy?.top_projetos_patio) ? legacy.top_projetos_patio : [],
        cargas_por_mes: Array.isArray(legacy?.cargas_por_mes) ? legacy.cargas_por_mes : [],
        carga: null,
      };
    }
    throw e;
  }
}
```

- Só omite chaves com `undefined | null | ''`.
- Fallback dispara **apenas em 404**; qualquer outro erro é propagado.

## 2. Refactor da página `ProducaoDashboardPage.tsx`

**Estado / queries**

- Remover `useState<DashboardData>`, `abortRef`, `requestIdRef` e loop manual de fetch/timeout.
- Manter `filters` como state (a busca continua manual via botão "Buscar" no `FilterPanel`).
- Adicionar `const [filtrosAplicados, setFiltrosAplicados] = useState(filters)` — atualizado só no `onSearch`, evitando refetch a cada tecla.
- Adicionar `const [tab, setTab] = useState<'resumo' | 'carga'>('resumo')`.

Queries com TanStack Query:

```ts
const qResumo = useQuery({
  queryKey: ['producao', 'visao-geral', filtrosAplicados, false],
  queryFn: () => fetchProducaoVisaoGeral(filtrosAplicados, false),
  enabled: erpReady && !!buscou,
  staleTime: 2 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
});

const qCarga = useQuery({
  queryKey: ['producao', 'visao-geral', filtrosAplicados, true],
  queryFn: () => fetchProducaoVisaoGeral(filtrosAplicados, true),
  enabled: erpReady && !!buscou && tab === 'carga',
  staleTime: 2 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
});
```

Nunca reutiliza `qResumo` para preencher `carga` — chave distinta pelo booleano.

**Layout**

Envolver o conteúdo hoje monolítico num `Tabs` mínimo:

```
<Tabs value={tab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="resumo">Resumo</TabsTrigger>
    <TabsTrigger value="carga">Carga</TabsTrigger>
  </TabsList>
  <TabsContent value="resumo">
    {/* KpiGrid + Top projetos + DashboardCharts + UserWidgetsSlot (conteúdo atual) */}
  </TabsContent>
  <TabsContent value="carga">
    <CargaResumoCard query={qCarga} />
  </TabsContent>
</Tabs>
```

**KPIs do topo (aba Resumo)** — lidos direto de `qResumo.data?.producao`, sem cálculos no cliente:

- Kg Previsto ← `kg_engenharia`
- Kg Produzido ← `kg_produzido`
- Kg Expedido ← `kg_expedido`
- Kg Pátio ← `kg_patio`
- Qtd Cargas ← `quantidade_cargas`
- Itens Não Carregados ← `itens_nao_carregados`
- Lead Time Total ← `leadtime_medio_total`
- Lead Time Engenharia ← `leadtime_medio_engenharia ?? leadtime_medio_engenharia_producao`
- Lead Time Produção ← `leadtime_medio_producao ?? leadtime_medio_producao_expedicao`
- (mantém "Aguardando Prod.", "Em Produção", "Parcial", "Total Expedidos" enquanto vierem no payload — apenas exibe se `!= null`).

Skeleton via `<KpiGrid>` mostrando placeholders durante `qResumo.isLoading`.

**Top Projetos em Pátio** — mesma lista/drills atuais, alimentados por `qResumo.data?.top_projetos_patio`, ordem **preservada tal como veio do backend** (remover o `.sort` que hoje é feito no `buildProjectDetails` só quando a fonte for o novo endpoint — se lista já vier ordenada, respeitar). Skeleton próprio quando carregando.

**Aba Carga (`CargaResumoCard`, componente inline)**

- Se `qCarga.isFetching` → `<Skeleton>` **só dentro da aba**, sem bloquear o resto da página.
- Se `qCarga.data?.carga` presente → 3 KPIs: Ocupação Média (%), Qtd Gargalos, Obras em Produção.
- Se `qCarga.data?.carga === null` **e** não está carregando → alerta neutro "Indicadores de carga ainda não carregados. Clique em Atualizar."
- Botão "Atualizar" chama `qCarga.refetch()`.
- Aba não faz nada até ser aberta (`enabled` só quando `tab === 'carga'`).

**Erros**

Novo helper `renderError(qResumo)`:

- 404 → "Atualização do backend ainda não disponível." (aparece só se o fallback também falhar 404, o que não deve ocorrer)
- Outros → "Não foi possível carregar a visão geral da produção."
- Botão "Tentar novamente" → `qResumo.refetch()`.

**Filtros existentes preservados**

Todos os inputs atuais (`numero_projeto`, `numero_desenho`, `revisao`, `cliente`, `cidade`) permanecem. `buildParams` só envia campos não-vazios. Espaço reservado para `data_ini`/`data_fim`/`situacoes`/`unidade_negocio`/`tipo_recurso` que a spec cita mas a UI ainda não expõe — encaminho o valor se vier, sem quebrar.

**`useAiPageContext` / `PageDataProvider`**

Continuam alimentados a partir de `qResumo.data?.producao` e `top_projetos_patio`; apenas troca a fonte.

## 3. O que deixa de ser chamado

- `/api/producao/dashboard` deixa de ser a chamada primária dos KPIs do topo (só sobra como fallback 404).
- Nenhum outro endpoint é chamado para reconstruir os cards do topo.

## 4. Fora de escopo

- Nenhuma nova aba adicional além de "Resumo" e "Carga" (o pedido do usuário confirmou isto).
- Nenhuma mudança em `CargaProducaoPage`, `cargaApi`, `DashboardCharts` ou nos endpoints das demais páginas.
- Nenhuma alteração em cálculos, SQL ou backend.

## 5. Arquivos

- **Novo** `src/lib/producao/visaoGeralApi.ts` — tipos, `buildParams`, `fetchProducaoVisaoGeral` (com fallback 404 → `/dashboard`).
- **Editar** `src/pages/producao/ProducaoDashboardPage.tsx` — migração para `useQuery`, `Tabs` (Resumo/Carga), leitura dos KPIs de `producao`, lazy da aba Carga, erros/skeletons revisados.

## 6. Verificação

- `tsgo --noEmit` limpo.
- Simular 404 mockando `api.get` (teste manual via console) — confirmar fallback e log.
- Ao alternar para "Carga" pela primeira vez, DevTools mostra **uma** requisição `visao-geral?incluir_carga=true&...`; ao voltar para "Resumo" e retornar, respeita `staleTime` (sem refetch imediato).
- Trocar filtros dispara nova key nas duas queries (nova busca só quando o usuário clica "Buscar").
