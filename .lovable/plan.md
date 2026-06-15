# Mover DRE para BI + integrar com Biblioteca BI

Objetivo: tirar a DRE do grupo principal e deixá-la dentro do menu **BI**, com a rota `/bi/contabilidade/dre`, e habilitar widgets customizados da Biblioteca BI (PageDataProvider + UserWidgetsSlot).

## Mudanças

### 1. Rota e arquivo da página
- Mover `src/pages/contabilidade/DrePage.tsx` → `src/pages/bi/contabilidade/DrePage.tsx`.
- `src/App.tsx`:
  - Atualizar import para `@/pages/bi/contabilidade/DrePage`.
  - Substituir `<Route path="/contabilidade/dre" ...>` por `<Route path="/bi/contabilidade/dre" element={<ProtectedRoute path="/bi/contabilidade/dre"><DrePage /></ProtectedRoute>} />`.

### 2. Sidebar
- `src/components/AppSidebar.tsx`:
  - Remover a entrada `Contabilidade — DRE` de `menuItems` (linha 42).
  - Adicionar em `biSubItems` (após "Validação BI Faturamento"):  
    `{ title: 'Contabilidade — DRE', url: '/bi/contabilidade/dre', icon: BarChart3 }`.
- Balanço Patrimonial permanece como está (não foi pedido para mover).

### 3. Catálogo de telas e permissões
- `src/lib/screenCatalog.ts`: trocar a chave `'/contabilidade/dre'` por `'/bi/contabilidade/dre'` mantendo `codigo: 'CONT_DRE'`, `nome: 'Contabilidade — DRE'`.
- `src/pages/ConfiguracoesPage.tsx`: atualizar o path da entrada DRE para `/bi/contabilidade/dre`.

### 4. Integração com Biblioteca BI
Na `DrePage.tsx`, envolver o conteúdo retornado em `PageDataProvider` (de `@/lib/bi/PageDataContext`) e adicionar os 3 slots padrão ao final:

```tsx
<PageDataProvider
  pageKey="contabilidade-dre"
  kpis={cards}
  series={series}
  rows={linhas}
  filtros={{ anomes_ini: anomesIni, anomes_fim: anomesFim, unidade, codigo_empresa: codigoEmpresa, codigo_filial: codigoFilial, centro_custo: centroCusto }}
>
  {/* layout atual (filtros, KPIs, tabela, gráficos) */}
  <div className="space-y-4 mt-4">
    <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />
    <UserWidgetsSlot section="charts" cols={2} emptyHint={false} />
    <UserWidgetsSlot section="tables" cols={1} emptyHint={false} />
  </div>
</PageDataProvider>
```

Imports: `PageDataProvider` de `@/lib/bi/PageDataContext` e `UserWidgetsSlot` de `@/components/bi`.

Não alterar lógica de cálculo (continua tudo vindo do backend `/api/bi/contabilidade/dre`) nem visual existente.

## Não muda
- Endpoint do backend.
- Layout, fórmulas, formatação de números, regras de cor/totalizadora.
- Página de Balanço Patrimonial.
