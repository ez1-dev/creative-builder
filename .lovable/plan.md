## Diagnóstico

Causa raiz do problema relatado (Maio aplica filtro mas zera KPIs):

No `src/pages/bi/ComercialPage.tsx`, o `dadosCombo` (linha 345-348) que alimenta o gráfico **Faturamento mensal x Meta** só carrega `{ label, faturamento, meta }`. O campo técnico `anomes_emissao` é descartado.

Quando o usuário clica em Maio:
- O recharts entrega ao handler `onClickMensal(d)` apenas `{label:"Maio", faturamento, meta}`.
- `onClickMensal` cai no fallback `d?.label`, normaliza para vazio (não é dígito), e então chama `applyCtxAsCrossFilter(extractDrillCtx(d, 'MENSAL'))`.
- `extractDrillCtx` acaba aceitando "Maio" como valor de `anomes_emissao`, gravando `filters.anomes_emissao = "Maio"`.
- O chip mostra "Ano/Mês: Maio" (cosmético), mas todas as queries enviam `anomes_emissao=Maio` ao backend → resultado vazio → KPIs zerados.

Per-widget loading/error já existem hoje via React Query (cada `useQuery` é independente, com `LoadingState`/`BlocoErro` por bloco — linhas 637, 710, 774, 833 etc.). Não há `Promise.all` global travando o dashboard. O que falta é a integridade do filtro técnico.

## Mudanças

### 1. `src/pages/bi/ComercialPage.tsx` — incluir chave técnica no dataset do gráfico mensal

`dadosCombo` passa a carregar `anomes_emissao` e `filtros_drill`:

```ts
const dadosCombo = useMemo(
  () => mensal.map((m) => {
    const anomes = normalizeAnomes(m.anomes_emissao);
    return {
      label: formatAnomesMes(m.anomes_emissao, { withYear: mensalMultiYear, abbr: mensalMultiYear }),
      anomes_emissao: anomes,
      filtros_drill: { anomes_emissao: anomes },
      faturamento: n(m.faturamento),
      meta: n(m.meta),
    };
  }),
  [mensal, mensalMultiYear],
);
```

E as variantes `bar/line/area` (linhas 680-682) param de destruir o payload — passam o objeto inteiro como datum (`label`, `valor`, `anomes_emissao`, `filtros_drill`):

```ts
const dadosMensalBar = dadosCombo.map((d) => ({
  label: d.label, valor: d.faturamento,
  anomes_emissao: d.anomes_emissao, filtros_drill: d.filtros_drill,
}));
```

### 2. `onClickMensal` — nunca usar label como fallback técnico

```ts
const onClickMensal = (d: any) => {
  const tech =
    d?.filtros_drill?.anomes_emissao ??
    d?.anomes_emissao ??
    d?.chave ??
    d?.activePayload?.[0]?.payload?.anomes_emissao ?? // fallback recharts
    null;
  const anomes = normalizeAnomes(tech);
  if (anomes.length !== 6) return; // sem chave técnica → não filtra

  const isSameMonth = filters.anomes_ini === anomes && filters.anomes_fim === anomes;
  if (isSameMonth) {
    const restore = periodoTopoAplicadoRef.current;
    setBase({ anomes_ini: restore.anomes_ini, anomes_fim: restore.anomes_fim });
    removeDrill('anomes_emissao');
  } else {
    setBase({ anomes_ini: anomes, anomes_fim: anomes });
    removeDrill('anomes_emissao');
  }
};
```

Remove `applyCtxAsCrossFilter` para o mensal — esse era exatamente o caminho que gravava "Maio" em `anomes_emissao`. Remove também os `console.log` deixados de depuração (linhas 451-453, 466, 470).

### 3. Chip "Ano/Mês" mostrar nome amigável

Em `src/lib/bi/comercialFilters.ts`, `getActiveDrillChips` ganha um formatter por chave para que o chip de `anomes_emissao` mostre **"Maio/2026"** (via `formatAnomesMes`) em vez do código técnico. O valor armazenado em `filters.anomes_emissao` continua sendo `"202605"`.

### 4. Endurecer outros handlers contra label como técnico

Em `extractDrillCtx` (`src/lib/bi/comercialDrillContract.ts`): quando `row.filtros_drill` não existir, montar ctx **apenas a partir de campos técnicos** (`cd_*`, `anomes_emissao`, `categoria_custom`). Hoje o catálogo (`comercialDrillCatalog.ts`) já restringe a esses campos, mas garantir explicitamente que `row.label`/`row.name` jamais sejam lidos como valor técnico, inclusive validando que `anomes_emissao` só seja aceito se bater em `/^\d{6}$/`.

Isso protege os demais cliques (Mix, Estado, Revenda, Obra, Mapa) contra a mesma regressão.

### 5. Confirmar isolamento de loading/erro por widget

Sem mudanças funcionais — apenas auditoria. Cada `useQuery` da página já tem `isLoading`/`isError`/`refetch` independentes e cada bloco renderiza `LoadingState` ou `BlocoErro` próprio. `retry: 1` mantém uma tentativa extra. Acrescentar comentário documentando que o React Query lida com cancelamento de queries obsoletas (via `queryKey: ['bi-comercial', ..., filters]` — qualquer mudança em `filters` invalida e recria a query; a resposta tardia da anterior é descartada pelo próprio React Query). Nenhuma alteração para `Promise.allSettled`/`AbortController` manual é necessária — não há esse padrão na página hoje.

### Fora de escopo

- Backend `/api/bi/comercial/*` (sem mudanças).
- Outras páginas BI.
- Refator de `useDashboardData` (não é usado pelo ComercialPage).

## Critério de aceite

- Clicar em **Maio** → `filters.anomes_ini = filters.anomes_fim = "202605"`, KPIs, Estado, Clientes, Revendas e Mapa atualizam.
- Chip mostra "**Ano/Mês: Maio/2026**" (rótulo amigável); valor interno é `202605`.
- Clicar novamente em Maio remove o filtro (toggle) e restaura o período do topo.
- Se um widget falhar, somente ele exibe `BlocoErro`; o resto do dashboard continua respondendo.
- Trocar de mês não dispara recarregamento duplicado (cache do React Query por `queryKey`).