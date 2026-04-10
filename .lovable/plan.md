

# Módulo Contas a Receber — Plano de Implementação

## Resumo

Criar a página "Contas a Receber" espelhando o módulo Contas a Pagar, adaptando a terminologia de fornecedor→cliente e os endpoints para `/api/contas-receber`. Tabelas ERP: `E501TCR` (títulos), `E501MCR` (movimentos), `E085CLI` (clientes).

## Arquivos a criar/modificar

### 1. Criar: `src/pages/ContasReceberPage.tsx`

Cópia adaptada de `ContasPagarPage.tsx` com as seguintes mudanças:
- Endpoint: `/api/contas-receber` (e export: `/api/export/contas-receber`)
- Filtros: "Fornecedor" → "Cliente" (`cliente` em vez de `fornecedor`)
- Checkbox "Somente cheques" → removido ou mantido conforme aplicável
- Checkbox "Agrupar por fornecedor" → "Agrupar por cliente"
- Colunas detalhadas: `codigo_cliente`, `nome_cliente`, `fantasia_cliente` (em vez de `_fornecedor`)
- Colunas agrupadas: idem, agrupamento por cliente
- KPIs: mesmos 11 indicadores, tooltip adaptado ("a receber" em vez de "a pagar")
- PageHeader: título "Contas a Receber", descrição "Consulta analítica de títulos financeiros a receber"

### 2. Modificar: `src/lib/api.ts`

Adicionar interface:
```typescript
export interface ContasReceberResponse extends PaginatedResponse<any> {
  resumo?: { /* mesma estrutura do ContasPagarResponse */ };
}
```

### 3. Modificar: `src/App.tsx`

- Importar `ContasReceberPage`
- Adicionar rota: `/contas-receber` com `ProtectedRoute`

### 4. Modificar: `src/components/AppSidebar.tsx`

- Adicionar item `{ title: 'Contas a Receber', url: '/contas-receber', icon: HandCoins }` logo após "Contas a Pagar"

## Especificação backend (para colar no FastAPI)

**Endpoints:**
- `GET /api/contas-receber` — paginado, mesma lógica do contas-pagar
- `GET /api/contas-receber-dashboard` — KPIs
- `GET /api/export/contas-receber` — Excel

**SQL:**
- Títulos: `E501TCR T` (VlrOri, VlrAbe, VctPro, CodTpt, NumTit, CodCli, DatEmi)
- Movimentos: `E501MCR M` (join por CodEmp, CodFil, CodTpt, NumTit)
- Cliente: `E085CLI C` (join por CodCli → NomCli, NomFan)
- Status calculado igual ao contas-pagar (PAGO, PARCIAL, VENCIDO, A_VENCER, EM_ABERTO)

**Labels Excel:**
```
filial, tipo_titulo, numero_titulo, codigo_cliente, nome_cliente,
fantasia_cliente, data_emissao, data_vencimento, data_ultimo_movimento,
valor_original, valor_aberto, valor_movimentado, valor_recebido,
quantidade_movimentos, status_titulo, dias_atraso
```

