

# Módulo Contas a Pagar — Plano de Implementação

## Resumo

Criar a página frontend "Contas a Pagar" seguindo o mesmo padrão visual e técnico das páginas existentes (PainelComprasPage, NotasRecebimentoPage). A página consumirá 3 endpoints FastAPI que o usuário criará no backend: `/api/contas-pagar`, `/api/contas-pagar-dashboard` e `/api/export/contas-pagar`.

O Lovable criará todo o frontend React + a especificação completa dos endpoints para colar no backend FastAPI.

---

## 1. Arquivos a criar/modificar

### Criar: `src/pages/ContasPagarPage.tsx`
Página principal com:
- **Filtros** no topo (FilterPanel): fornecedor, número título, tipo título, filial, status título (Select com PAGO/PARCIAL/VENCIDO/A_VENCER/EM_ABERTO), checkboxes (somente vencidos, somente saldo aberto, somente cheques), datas emissão ini/fim, datas vencimento ini/fim, datas pagamento ini/fim, valor mín/máx, checkbox agrupar por fornecedor
- **11 KPIs** com KPICard: total títulos, total fornecedores, valor original, valor aberto, valor pago, qtd vencidos, valor vencido, valor a vencer 7d, valor a vencer 30d, ticket médio, maior atraso
- **Tabs** alternando entre grid detalhada e grid agrupada por fornecedor
- **Grid detalhada** (16 colunas): filial, tipo título, número título, código/nome/fantasia fornecedor, data emissão, data vencimento, último movimento, valor original, valor aberto, valor movimentado, valor pago, qtd movimentos, status título (com badge colorido), dias atraso
- **Grid agrupada** (12 colunas): código/nome/fantasia fornecedor, qtd títulos, títulos aberto, títulos vencidos, valor original, valor aberto, valor pago, maior atraso, primeiro/último vencimento
- **Paginação** e **Exportar Excel**

### Criar: `src/lib/api.ts` (adicionar interface)
```typescript
export interface ContasPagarResponse extends PaginatedResponse<any> {
  resumo?: {
    total_titulos: number;
    total_fornecedores: number;
    valor_original_total: number;
    valor_aberto_total: number;
    valor_pago_total: number;
    titulos_vencidos: number;
    valor_vencido_total: number;
    valor_a_vencer_7d: number;
    valor_a_vencer_30d: number;
    ticket_medio: number;
    maior_atraso_dias: number;
  };
}
```

### Modificar: `src/App.tsx`
- Importar `ContasPagarPage`
- Adicionar rota `/contas-pagar` com ProtectedRoute

### Modificar: `src/components/AppSidebar.tsx`
- Adicionar item "Contas a Pagar" no array `modules` com ícone `Wallet` (ou `Receipt`)

---

## 2. Padrões seguidos

- Mesmo layout de FilterPanel + KPICard + DataTable + PaginationControl
- ExportButton apontando para `/api/export/contas-pagar`
- ComboboxFilter para campos com sugestões dinâmicas
- Status renderizado com badges coloridos (verde=PAGO, amarelo=PARCIAL, vermelho=VENCIDO, azul=A_VENCER, cinza=EM_ABERTO)
- KPIs calculados via `data.resumo` (API) com fallback `useMemo` nos dados brutos
- Filtros limpos com botão "Limpar" (padrão existente)

---

## 3. Especificação dos endpoints FastAPI (para colar no backend)

Será entregue como comentário/documentação dentro do código ou separadamente:

**GET /api/contas-pagar** — Consulta paginada de títulos
- Query params: todos os filtros listados + `pagina`, `tamanho_pagina` (max 100), `agrupar_por_fornecedor`
- SQL: CTE MOV (agregação E501MCP) + CTE BASE (E501TCP + E095FOR + MOV)
- Joins conforme especificado (CodEmp, CodFil, CodTpt, NumTit)
- Status calculado no SQL
- Retorna `{ pagina, tamanho_pagina, total_registros, total_paginas, dados, resumo }`

**GET /api/contas-pagar-dashboard** — KPIs e gráficos (mesmos filtros sem paginação)

**GET /api/export/contas-pagar** — Excel via `_collect_paginated_data` + `_xlsx_response`

Labels Excel:
```
filial, tipo_titulo, numero_titulo, codigo_fornecedor, nome_fornecedor,
fantasia_fornecedor, data_emissao, data_vencimento, data_ultimo_movimento,
valor_original, valor_aberto, valor_movimentado, valor_pago,
quantidade_movimentos, status_titulo, dias_atraso
```

---

## Detalhes técnicos

- A página chamará `api.get<ContasPagarResponse>('/api/contas-pagar', params)`
- Checkbox "Agrupar por fornecedor" alterna entre duas definições de colunas (`columnsDetalhada` / `columnsAgrupada`)
- Formatação via `formatCurrency`, `formatDate`, `formatNumber` existentes
- Não será usado CodSnf em nenhum momento

