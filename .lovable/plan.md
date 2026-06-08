# Cross-filter + Menu de Drill (clique direito) no BI Comercial

## Objetivo

Tornar todos os gráficos do `/bi/comercial` interativos:

- **Clique esquerdo** numa barra/fatia/ponto → aplica aquele valor como filtro global da página e recarrega TODOS os outros gráficos e KPIs.
- **Clique direito** no mesmo ponto → abre menu de contexto com:
  - "Filtrar dashboard por <valor>" (mesmo efeito do clique esquerdo)
  - "Detalhar em..." → lista os drills permitidos (`NEXT_DRILLS`), abrindo o drawer existente (`ComercialDrillDrawer`).
  - "Limpar filtros".

Hoje o clique esquerdo abre o drawer de drill direto; isso vai mudar para o novo comportamento. O drawer só abrirá via menu de contexto ou pelas ações de detalhar existentes.

## Comportamento do cross-filter

- Cada clique adiciona/atualiza UMA chave de filtro (`anomes_emissao`, `cd_estado`, `cd_cliente`, `cd_revenda`, `cd_produto`, `cd_prj`, etc.) ao estado global de filtros da página.
- O filtro aparece como **chip removível** no topo (mesma faixa de chips dos filtros atuais), com "×" para remover individualmente e botão "Limpar tudo".
- Todos os hooks de dados da página (`qMensal`, `qEstado`, `qMix`, `qRevenda`, `qObras`, KPIs, Mapa, Tabela mensal) passam a receber esse contexto e refazem fetch automaticamente via React Query (key derivada do contexto).
- Cliques repetidos no mesmo valor = toggle (remove). Clicar em valor diferente da mesma dimensão = substitui.

## Arquitetura

```text
ComercialPage
 ├─ useComercialCrossFilter (novo hook)
 │    state: Record<DrillKey, string>
 │    actions: setFilter, toggleFilter, removeFilter, clearAll
 │    derived: queryKeySuffix, asDrillContexto()
 │
 ├─ filters globais (anomes_ini/fim/unidade) + crossFilter → contexto efetivo
 │    usado em TODAS as queries (qMensal, qEstado, qMix, qRevenda, qObras, KPIs)
 │
 ├─ ChartCardShell (wrap existente)
 │    + onContextMenu no container → abre <ChartContextMenu>
 │    + repassa onItemClick (clique esquerdo = cross-filter)
 │
 └─ ChartContextMenu (novo, shadcn ContextMenu)
      itens dinâmicos baseados no drill_type do widget
```

### Mapeamento clique → chave de filtro

Reusa `extractDrillCtx` / `ROW_TO_CTX_KEY` já existentes em `comercialDrillCatalog`. Cada handler atual (`onClickMensal`, `onClickEstado`, etc.) passa a chamar `applyCrossFilter(ctx)` em vez de `openDrill(...)`. O `openDrill` continua existindo, mas só é invocado pelo menu de contexto ou pelos botões "Detalhar" dos KPIs.

### Backend

Nada muda no backend. O contexto de cross-filter é enviado para as MESMAS rotas já consumidas (`/api/bi/comercial/...`) como filtros adicionais — todas elas já aceitam `cd_estado`, `cd_cliente`, `cd_produto`, `anomes_emissao`, etc.

## Mudanças por arquivo

1. **`src/hooks/useComercialCrossFilter.ts`** (novo) — estado + ações + serialização para query keys.
2. **`src/pages/bi/ComercialPage.tsx`**
   - Integra `useComercialCrossFilter`.
   - Adiciona o contexto às chaves e payloads de todas as queries de série (`qMensal`, `qEstado`, `qMix`, `qRevenda`, `qObras`) e dos KPIs.
   - Reescreve `onClickMensal/Estado/Mix/Revenda/Obra/Mapa` para chamar `applyCrossFilter` em vez de `openDrill`.
   - Renderiza nova faixa de chips de cross-filter (logo abaixo dos chips de drill atuais) com "×" e "Limpar".
   - Envolve cada widget retornado por `renderSerieGeneric` num `ChartContextMenu`.
3. **`src/components/bi/charts/ChartCardShell.tsx`** — aceita prop opcional `onContextMenu` no wrapper para que páginas externas plugem menu sem alterar cada chart.
4. **`src/components/bi/runtime/ChartContextMenu.tsx`** (novo) — componente shadcn `<ContextMenu>` com itens:
   - "Filtrar por <valor>" (quando há ponto identificado pelo evento)
   - submenu "Detalhar em..." listando `NEXT_DRILLS[drill_type]`
   - "Remover filtro desta dimensão"
   - "Limpar todos os filtros"
5. **`mem/features/drill-bi-comercial.md`** — registra o novo padrão de interação (clique esquerdo = cross-filter, direito = drill).

## Detalhes técnicos

- **Detectar o ponto no clique direito**: Recharts não dá `onContextMenu` por ponto nativamente. Solução: o `onContextMenu` fica no container do card e o último ponto sobre o qual o mouse passou (`onMouseMove` do chart já existente) é guardado num ref do shell. Isso é suficiente para abrir o menu com "Filtrar por <valor do ponto>".
- **Toggle**: se o usuário clica de novo no mesmo mês/estado já filtrado, a chave é removida. Visual: a barra/fatia ativa recebe destaque (`opacity` ou `stroke`) — implementado com prop `activeKey` opcional em `BarChartCard`/`DonutChartCard`/`HorizontalBarChartCard`/`RankingChartCard` (pequena adição CSS).
- **Mapa do Brasil**: `BrazilMapCard` já tem `onItemClick`; ganha também `onItemContextMenu`.
- **Mix (origem/tipo)**: não tem chave única de filtro global; mantém comportamento atual (abre drill `NOTA_FISCAL` com filtro derivado). Menu de contexto oferece "Filtrar dashboard por origem/tipo" usando `cd_tip_mov` quando disponível.
- **Performance**: as queries já são por React Query; mudança no contexto invalida apenas as queries cuja key contém aquela chave. Sem refetch redundante.

## Fora de escopo

- Cross-filter entre páginas (continua local à `/bi/comercial`).
- Persistir o cross-filter em URL / preferências do usuário (pode ser próximo passo).
- Backend / novas rotas / sincronizações.
- Outras páginas BI (`/bi/...`) — este plano cobre só Comercial.

## Critérios de aceite

- Clicar numa barra do gráfico Mensal filtra a página inteira por aquele `anomes_emissao`; chip aparece no topo; todos os outros gráficos/KPIs recarregam.
- Clicar de novo na mesma barra remove o filtro.
- Clicar com botão direito num ponto abre menu com "Filtrar por...", submenu "Detalhar em..." e "Limpar".
- Selecionar "Detalhar em..." abre o `ComercialDrillDrawer` no drill escolhido, herdando o contexto atual (global + cross-filter).
- Funciona em Mensal, Estado, Mapa, Mix, Revendas, Obras e KPIs.
- Nenhuma rota nova no backend; apenas filtros já existentes são enviados.
