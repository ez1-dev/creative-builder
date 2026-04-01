

# Página de Conciliação ERP x EDocs

## Resumo
Criar uma nova página de consulta seguindo o padrão da Auditoria Tributária, com filtros flexíveis, KPIs de resumo e tabela de dados para conciliação entre ERP e EDocs.

## Arquivos a criar/alterar

### 1. `src/lib/api.ts` — Adicionar interface de resposta
- Adicionar `ConciliacaoEdocsResponse` com `resumo` (totais por status: ok, sem_edocs, sem_erp, divergente_valor, divergente_situacao) e `dados` paginados

### 2. `src/pages/ConciliacaoEdocsPage.tsx` — Nova página
**Filtros:**
- Período (data inicial / data final)
- Empresa, Filial, Fornecedor, CNPJ
- Número NF, Série, Chave NF
- Status Conciliação (select: Todos, OK, SEM_EDOCS, SEM_ERP, DIVERGENTE_VALOR, DIVERGENTE_SITUACAO)

**KPIs:**
- Total Registros, OK, Sem EDocs, Sem ERP, Divergentes

**Colunas da tabela:**
- Empresa, Filial, Número NF, Série, Fornecedor, CNPJ, Data Emissão, Data Entrada, Valor ERP, Valor EDocs, Situação ERP, Situação EDocs, Status Conciliação (com badges coloridos)

**Endpoint:** `GET /api/conciliacao-edocs` com paginação (mesmo padrão das outras páginas)

**Badges de status:**
- OK → verde
- SEM_EDOCS → laranja/warning
- SEM_ERP → laranja/warning
- DIVERGENTE_VALOR → vermelho/destructive
- DIVERGENTE_SITUACAO → vermelho/destructive

### 3. `src/components/AppSidebar.tsx` — Adicionar item no menu
- Novo módulo "Conciliação EDocs" com ícone `FileSearch` na lista de módulos

### 4. `src/App.tsx` — Adicionar rota
- Rota `/conciliacao-edocs` com `ProtectedRoute`

### 5. Exportação
- Botões de export Excel e CSV seguindo o padrão existente

