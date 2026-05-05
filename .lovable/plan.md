## Aba "Auditoria Revenda" em Faturamento Genius

Nova aba dentro de `src/pages/FaturamentoGeniusPage.tsx` para consultar pedidos/NFs sem revenda via API FastAPI, com exportação Excel. Sem uso de Lovable Cloud — somente API externa.

### 1. Estrutura de navegação (Tabs)
A página hoje renderiza um único conteúdo. Vou envolver o corpo atual num componente `<Tabs>` (shadcn) com duas abas:
- **Faturamento** (conteúdo atual, sem alterações de comportamento)
- **Auditoria Revenda** (nova)

`PageHeader` permanece no topo, fora das abas.

### 2. Novo componente: `FaturamentoGeniusAuditoriaRevenda`
Arquivo: `src/components/faturamento/AuditoriaRevendaTab.tsx`

**Estado de filtros** (sem datas hardcoded; defaults com `currentYYYYMM()` apenas como sugestão editável):
- `anomes_ini` (string YYYYMM, obrigatório)
- `anomes_fim` (string YYYYMM, obrigatório)
- `numprj` (string, obrigatório)
- `origem` ∈ `TODOS | PEDIDO | NF` (default `TODOS`)
- `codfil`, `cliente`, `pedido`, `nf` (opcionais)
- `pagina` (default 1), `tamanho_pagina` (default 50)

**Validação client-side** antes de chamar a API:
- regex `^\d{6}$` para `anomes_ini` e `anomes_fim`
- mês entre 01 e 12
- `anomes_ini ≤ anomes_fim`
- `numprj` não-vazio
- Em caso de erro: `toast.error(...)` e abortar request

### 3. Layout
```text
[Card de Filtros]
  Linha 1: Ano/Mês Inicial | Ano/Mês Final | Projeto | Origem(Select)
  Linha 2: Filial | Cliente | Pedido | Nota Fiscal
  Ações:   [Buscar Auditoria] [Exportar Excel]

[KpiGroup com 4 cards]
  Total registros | Exibidos na página | Pedidos s/ revenda | NFs s/ revenda

[DataTable com paginação inferior]
```

Mantém o visual atual: `Card`, `Label`, `Input`, `Select`, `Button` shadcn; `KpiGroup`/`KPICard` e `DataTable`/`PaginationControl` reutilizados.

### 4. Chamadas à API
Usando o cliente existente `api` (`src/lib/api.ts`) — já adiciona `Authorization: Bearer <token>` e `ngrok-skip-browser-warning: true` automaticamente.

**Buscar:**
```ts
const resp = await api.get<AuditoriaRevendaResponse>(
  '/api/faturamento-genius/auditoria-revenda',
  { anomes_ini, anomes_fim, numprj, origem, codfil, cliente, pedido, nf, pagina, tamanho_pagina }
);
```

**Exportar Excel:** abrir nova aba com URL assinada:
```ts
const url = api.getExportUrl('/api/export/faturamento-genius/auditoria-revenda', { ...filtros });
window.open(url, '_blank');
```
`getExportUrl` já injeta `access_token` na query string.

**Tipo de resposta** (definido no próprio componente, pode evoluir depois):
```ts
interface AuditoriaRevendaItem {
  origem: string; empresa: string; filial: string;
  data_emissao: string; anomes: string;
  pedido: string; serie_nf: string; nf: string; item_nf: string;
  cod_cliente: string; cliente: string;
  projeto: string; produto: string; derivacao: string;
  revenda: string | null;
  tipo_pendencia: string; motivo: string;
}
interface AuditoriaRevendaResponse extends PaginatedResponse<AuditoriaRevendaItem> {
  resumo?: { total_pedidos_sem_revenda?: number; total_nfs_sem_revenda?: number };
}
```

### 5. Tabela (`DataTable`)
Colunas na ordem solicitada: Origem, Empresa, Filial, Data Emissão (formatDate), Ano/Mês (`fmtAnomes`), Pedido, Série NF, NF, Item NF, Código Cliente, Cliente, Projeto, Produto, Derivação, Revenda (badge cinza "Sem revenda" quando null/vazio), Tipo Pendência, Motivo.

### 6. KPIs (cards de resumo)
- **Total de registros encontrados** = `resp.total_registros`
- **Exibidos na página** = `resp.dados.length`
- **Pedidos sem revenda na página** = `resp.dados.filter(d => d.origem === 'PEDIDO').length`
- **NFs sem revenda na página** = `resp.dados.filter(d => d.origem === 'NF').length`

(Se o backend já retornar agregados em `resumo`, prefere-se eles; caso contrário cálculo local.)

### 7. Paginação
Reutiliza `PaginationControl` (já mostra página atual / total / próxima / anterior / total registros).

### 8. Comportamento
- Busca **não dispara automaticamente** — só ao clicar "Buscar Auditoria" (evita chamadas sem filtros válidos, dado que `numprj` é obrigatório).
- Mudança de página chama o fetch novamente preservando filtros.
- Mensagens de erro de rede usam o tratamento amigável já existente em `api.ts` (network/CORS/ngrok caído).
- Sem persistência em Supabase / Lovable Cloud.

### Arquivos afetados
- **Editar** `src/pages/FaturamentoGeniusPage.tsx` — envolver conteúdo atual em `<Tabs>` e adicionar `<TabsContent value="auditoria">`.
- **Criar** `src/components/faturamento/AuditoriaRevendaTab.tsx` — todo o novo módulo.

Nada mais é tocado (sem migrations, sem edge functions, sem alterações em rotas/sidebar).
