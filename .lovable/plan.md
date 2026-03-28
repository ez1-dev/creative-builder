

# Nova Aba: Notas Fiscais de Recebimento

## Resumo

Criar a página `NotasRecebimentoPage` seguindo o mesmo padrão do `PainelComprasPage`: filtros, KPIs, tabela analítica com paginação e exportação Excel. O endpoint backend (`/api/notas-recebimento`) já será criado pelo usuário no lado servidor -- o frontend apenas consome.

## Arquivos a criar/alterar

### 1. Criar `src/pages/NotasRecebimentoPage.tsx`
Página completa seguindo o padrão existente:

**Filtros** (dentro de `FilterPanel`):
- Fornecedor, Número NF, Série, Código item, Descrição item
- Centro de custo, Projeto, Transação
- Data recebimento de/até (type="date")
- Tipo item (Select: Todos/Produto/Serviço)
- Valor líquido mín/máx

**KPIs** (6 cards com `KPICard` + animação stagger):
- NFs distintas, Itens recebidos, Fornecedores, Valor líquido total, Valor bruto total, Qtd. recebida total

**Tabela** (usando `DataTable`):
- Colunas: NF, Série, Fornecedor, Emissão, Recebimento, Tipo, Código item, Descrição, Derivação, UM, Transação, Depósito, Centro custo, Projeto, Qtd. recebida, Preço unit., Valor bruto, Valor líquido, IPI, ICMS, ICMS ST, PIS, COFINS, ISS, OC origem

**Paginação** com `PaginationControl`

**Exportação** com `ExportButton` apontando para `/api/export/notas-recebimento`

**API call**: `api.get('/api/notas-recebimento', params)` retornando `PaginatedResponse` com `resumo` opcional.

### 2. Atualizar `src/lib/api.ts`
Adicionar interface `NotasRecebimentoResponse`:
```typescript
export interface NotasRecebimentoResponse extends PaginatedResponse<any> {
  resumo?: {
    total_nfs: number;
    total_itens: number;
    total_fornecedores: number;
    valor_liquido_total: number;
    valor_bruto_total: number;
    quantidade_recebida_total: number;
  };
}
```

### 3. Atualizar `src/components/AppSidebar.tsx`
Adicionar item no array `modules`:
```typescript
{ title: 'NF Recebimento', url: '/notas-recebimento', icon: FileInput }
```

### 4. Atualizar `src/App.tsx`
Adicionar rota:
```typescript
<Route path="/notas-recebimento" element={<NotasRecebimentoPage />} />
```

## Detalhes Técnicos
- KPIs calculados client-side a partir de `resumo` (se a API retornar) ou dos `dados` da página atual como fallback
- Mesmos componentes reutilizados: `PageHeader`, `FilterPanel`, `DataTable`, `PaginationControl`, `ExportButton`, `KPICard`
- Formatação com `formatCurrency`, `formatNumber`, `formatDate` de `src/lib/format.ts`
- Sem gráficos nesta primeira versão (aba analítica primeiro, conforme recomendação do usuário)

