## Consumir contrato completo de capacidade de Unidade de Negócio

O flag `suporta_filtro_unidade` já é lido, mas os novos campos `unidade_regra`, `unidade_indisponivel_motivo`, `unidade_filtro_ignorado` e a leitura defensiva de `unidades_negocio` ainda não são tratados. Também falta sanear a URL e o estado local quando o backend não suporta ou ignora o filtro.

### 1. Camada de contrato — helper compartilhado

`src/lib/contabil/dreMatrizApi.ts` e `src/hooks/contabil/api.ts` (tipo `ResultadoProntoMeta`):

- Adicionar aos tipos e à normalização de meta:
  - `unidade_regra: string | null`
  - `unidade_indisponivel_motivo: string | null`
  - `unidade_filtro_ignorado: boolean`
- Criar `src/lib/contabil/unidadeCapabilities.ts` com:
  ```ts
  getUnidadeCapabilities(meta): {
    carregado, suportaFiltro, unidades, regra, motivo, filtroIgnorado
  }
  ```
  Aceita tanto meta de `dre/matriz` quanto de `resultado-pronto` (mesmo shape). `carregado = meta != null`.

### 2. Visualização — `DreStudioVisualizacaoPage.tsx`

- Substituir `q.meta?.suporta_filtro_unidade === true` pelo helper. Usar `mostrarFiltro = caps.carregado && caps.suportaFiltro` para eliminar flash.
- Se `caps.filtroIgnorado === true` e `unidade !== "TODOS"`: forçar `setUnidade("TODOS")` via `useEffect`, e exibir aviso amarelo discreto acima da grid com texto:
  > "O filtro de Unidade de Negócio não foi aplicado pelo backend. Os valores exibidos são consolidados."
- Quando `mostrarFiltro === false`, garantir que `unidade` está em `"TODOS"` e que nenhuma chamada envia `unidade` (já ok em `dreMatrizApi` e `resultado-pronto`, apenas resetar estado).
- Ao trocar modelo/período: manter `unidade` no queryKey (já está) e resetar para `"TODOS"` no `useEffect` que observa `caps.suportaFiltro` virando false.
- Passar `caps` ao pai via callback existente, expandindo `onSuporteUnidadeChange` para `onCapabilitiesChange(caps)` (mantendo compat com boolean simples).

### 3. Página `DrePadraoPage.tsx`

- Trocar `suportaFiltroUnidade` boolean por `caps` recebidas do filho.
- Badge/tooltip "Visão consolidada" permanece quando `!caps.suportaFiltro`.
- Substituir o texto fixo do alerta azul por `caps.motivo` quando presente; fallback:
  > "O filtro por Unidade de Negócio ainda não está disponível para esta matriz."
- Sanear URL:
  ```ts
  useEffect(() => {
    if (caps.carregado && !caps.suportaFiltro && searchParams.has("unidade")) {
      const next = new URLSearchParams(searchParams);
      next.delete("unidade");
      setSearchParams(next, { replace: true });
    }
  }, [caps, searchParams]);
  ```
  (usa `useSearchParams` de `react-router-dom`).
- Se `caps.regra` presente, mostrar em tooltip técnico do badge (informativo, sem duplicar lógica).

### 4. Drill

Nada muda: `useDrillDre` já aceita `agrupar_por=unidade_negocio` e o menu de drills continua ativo independentemente do flag. Nenhuma classificação local por prefixo `G-`/`E-`.

### 5. Estado esperado agora

Backend responde `suporta_filtro_unidade: false` → sem Select, badge "Visão consolidada", aviso com o `motivo` do backend, URL saneada, nenhum parâmetro `unidade` enviado. Quando o backend virar `true`, o Select aparece automaticamente populado por `meta.unidades_negocio`.

### Arquivos a alterar

- `src/lib/contabil/unidadeCapabilities.ts` (novo)
- `src/lib/contabil/dreMatrizApi.ts` — estender meta
- `src/hooks/contabil/api.ts` — estender `ResultadoProntoMeta` e merge de meta
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — helper, guarda de flash, reset em filtro ignorado, callback expandido
- `src/pages/contabilidade/dre-padrao/DrePadraoPage.tsx` — motivo dinâmico, saneamento de URL, tooltip com regra
