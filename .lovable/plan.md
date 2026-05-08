## Componente novo: `BrazilChoroplethMap`

Mapa coroplético puro do Brasil por UF (sem markers de cidade) — independente do `MapaCidadesViagens` que já existe. Reutilizável em qualquer dashboard.

### Arquivos

**`src/components/maps/BrazilChoroplethMap.tsx`** (novo)
- Props:
  ```ts
  dados: { uf: string; estado?: string; valor: number }[]
  title?: string
  valueFormatter?: (v: number) => string
  height?: number          // default 520
  geoUrl?: string          // default '/geo/brasil-uf.json'
  onSelectUF?: (uf) => void
  selectedUF?: string[]
  ```
- Usa `react-simple-maps` + `/geo/brasil-uf.json` (já existe).
- Escala automática: opacity de `--primary` interpolada entre 0.18 (mín) e 0.88 (máx).
- UF sem dado → `hsl(var(--muted))`.
- Tooltip nativo `<title>` com nome + UF + valor formatado.
- Legenda gradient embaixo com mín, máx e chip "sem dados".
- Apenas tokens semânticos do design system (sem cores hardcoded).

### Registro como widget

**`src/lib/visualCatalog.ts`**
- Adicionar item `{ key: 'passagens.mapa-choropleth-uf', label: 'Mapa Coroplético — Valores por UF' }` no grupo Passagens Aéreas.

**`src/hooks/usePassagensLayout.ts`**
- Adicionar `mapa-choropleth-uf` na lista canônica `PASSAGENS_DEFAULT_WIDGETS`, posicionado **logo após `mapa-cidades`**:
  ```
  kpis-row             y=0  h=3
  mapa-cidades         y=3  h=8
  mapa-choropleth-uf   y=11 h=8   ← novo
  mapa-destinos        y=19 h=7
  charts-row           y=26 h=12
  tabela-registros     y=38 h=10
  ```

**`src/components/passagens/PassagensDashboard.tsx`**
- Importar `BrazilChoroplethMap`.
- Agregar `mapaUF` por UF a partir de `mapaData` (qtd e valor); usar `valor`.
- Adicionar bloco no objeto `blocks`:
  ```tsx
  ...(canSeeVisual('passagens.mapa-choropleth-uf') ? {
    'mapa-choropleth-uf': (
      <BrazilChoroplethMap
        title="Valor por Estado"
        dados={mapaUF}
        valueFormatter={formatCurrency}
        selectedUF={selectedUF}
        onSelectUF={(uf) => setSelectedUF((prev) => toggleItem(prev, uf))}
      />
    ),
  } : {}),
  ```

### Migration — atualizar dashboard default
SQL `UPDATE` nos widgets do dashboard `passagens-aereas` (default) para reposicionar `mapa-destinos`, `charts-row`, `tabela-registros` nos novos `y` e inserir `mapa-choropleth-uf` em `y=11`.

### Notas
- O componente é genérico — outros módulos podem importar de `@/components/maps/BrazilChoroplethMap` sem depender de Passagens.
- Não toca em RLS, autenticação ou outros componentes existentes.