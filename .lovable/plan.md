
## Objetivo

Adicionar em **Configurações** uma nova aba **"Gráficos e Mapas"** onde admins escolhem, **por perfil de acesso**, quais gráficos/mapas cada usuário pode visualizar nas telas do ERP. Quando o perfil não tiver permissão para um gráfico, ele simplesmente não é renderizado para o usuário (a página continua acessível, só os visuais ocultam).

## Catálogo de gráficos/mapas (versão 1)

Identificados no código atual e expostos como entradas configuráveis:

```text
Passagens Aéreas
  ├─ passagens.mapa-destinos          Mapa de Destinos (Brasil)
  ├─ passagens.top-destinos           Top 5 Destinos
  └─ passagens.kpis-charts            Gráficos do dashboard de passagens

Produção – Dashboard
  ├─ producao.cargas-periodo          Cargas por Período
  ├─ producao.status-projetos         Status dos Projetos
  └─ producao.top-saldo-patio         Top Projetos com Maior Saldo em Pátio

Produção – Relatório Semanal Obra
  ├─ producao.top-peso                Top 10 Obras por Peso
  ├─ producao.top-pecas               Top 10 Obras por Peças
  ├─ producao.top-cargas              Top 10 Obras por Cargas
  ├─ producao.evolucao-semanal        Evolução Semanal
  ├─ producao.peso-medio-carga        Peso Médio por Carga
  └─ producao.clientes-participacao   Participação por Cliente

Produção – Meta Entrega Semanal
  └─ producao.meta-semanal            Meta de Entrega Semanal

Painel de Compras
  ├─ compras.top-fornecedores         Top Fornecedores
  ├─ compras.top-familias             Top Famílias
  └─ compras.top-origens              Top Origens

Faturamento Genius
  └─ faturamento.charts               Análises gráficas de faturamento

Configurações (admin)
  └─ admin.dashboard-uso              Dashboard de Uso de Usuários
```

Catálogo fica em `src/lib/visualCatalog.ts` (constante exportada) — fácil adicionar novos itens depois.

## Banco de dados

Nova tabela em Lovable Cloud:

```text
profile_visuals
  id            uuid PK
  profile_id    uuid → access_profiles.id (cascade)
  visual_key    text  (ex: "passagens.mapa-destinos")
  can_view      bool  default true
  created_at    timestamptz
  UNIQUE (profile_id, visual_key)
```

RLS espelha `profile_screens`:
- SELECT para qualquer authenticated.
- ALL apenas para admin (`is_admin(auth.uid())`).

**Default**: ausência de linha = pode ver (compatível, não quebra nada). Admin desmarca para ocultar.

## Frontend

### 1. Hook `useUserVisuals`

`src/hooks/useUserVisuals.ts`. Mesma mecânica do `useUserPermissions`: descobre `profile_id` do `erpUser`, busca `profile_visuals` daquele perfil, expõe:

```ts
{ canSeeVisual: (key: string) => boolean, loading: boolean }
```

Regra: se não houver registro → `true`. Se houver com `can_view=false` → `false`. Admin sempre vê tudo.

### 2. Wrapper `<VisualGate>`

`src/components/VisualGate.tsx`:

```tsx
<VisualGate visualKey="passagens.mapa-destinos">
  <MapaDestinosCard ... />
</VisualGate>
```

Renderiza `null` enquanto `loading`, depois `children` se permitido. Zero refactor invasivo nos componentes existentes.

### 3. Aplicação nos componentes

Apenas envolver os blocos atuais com `<VisualGate>` nos arquivos:
- `PassagensDashboard.tsx`, `MapaDestinosCard.tsx` (chamada na page)
- `producao/components/DashboardCharts.tsx` (3 cards)
- `producao/RelatorioSemanalObraCharts.tsx` (6 ChartCard)
- `producao/MetaEntregaSemanalChart.tsx`
- `PainelComprasPage.tsx` (3 blocos Top)
- `FaturamentoGeniusPage.tsx` (seção de charts)
- `ConfiguracoesPage.tsx` (Dashboard de Uso)

### 4. Aba "Gráficos e Mapas" em Configurações

Em `ConfiguracoesPage.tsx`:

- Novo `TabsTrigger value="visuals"` (ícone `BarChart3`).
- Layout: `Select` com perfil no topo → lista agrupada por módulo (collapsibles), cada item com `Checkbox` "Pode ver".
- Mesma UX/visual da aba "Telas por Perfil" já existente (consistência).
- Toggle grava/upserta em `profile_visuals`. Toast de confirmação.
- Botões utilitários: "Marcar todos do módulo" / "Desmarcar todos do módulo".

```text
┌─ Perfil: [Operador        ▼] ─────────────────────┐
│                                                   │
│  ▾ Passagens Aéreas              [✓ todos] [✗]   │
│     ☑ Mapa de Destinos                           │
│     ☑ Top 5 Destinos                             │
│     ☐ Gráficos do dashboard                      │
│                                                   │
│  ▾ Produção – Dashboard                          │
│     ☑ Cargas por Período                         │
│     ...                                           │
└───────────────────────────────────────────────────┘
```

## Detalhes técnicos

- **Migration**: criar tabela `profile_visuals` + RLS + index `(profile_id, visual_key)`.
- **Tipos Supabase**: regenerados automaticamente.
- **Sem impacto** em `profile_screens` — permissões de tela continuam funcionando como hoje. Esta é uma camada adicional, mais granular.
- **Performance**: hook faz 1 query (`profile_visuals` filtrada por perfil) em paralelo com a query atual de telas; resultado memoizado em `Map<string, boolean>`.
- **Admin bypass**: `useUserVisuals` retorna `canSeeVisual = () => true` se `is_admin`.

## Arquivos novos/alterados

Novos:
- `src/lib/visualCatalog.ts`
- `src/hooks/useUserVisuals.ts`
- `src/components/VisualGate.tsx`
- migration SQL (tabela + RLS)

Alterados:
- `src/pages/ConfiguracoesPage.tsx` (nova aba)
- ~7 componentes/páginas com gráficos (apenas wrap com `<VisualGate>`)

## Fora do escopo (v1)

- Permissão por usuário individual (continua por perfil).
- Permissão de KPIs/cards (apenas gráficos e mapas).
- Catálogo dinâmico auto-descoberto — usaremos lista estática mantida em `visualCatalog.ts`.

Aprovar para eu implementar.
