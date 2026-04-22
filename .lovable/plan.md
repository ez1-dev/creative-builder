
## Nova tela: Auditoria Apontamento Genius

### Escopo
Página analítica `/auditoria-apontamento-genius` para conferir apontamentos de produção da operação **GENIUS** (origens 110, 120, 130, 135, 140, 150, 205, 208, 210, 220, 230, 235, 240, 245, 250), comparando início/fim e destacando apontamentos > 8h ou totais diários > 8h por operador.

A página segue o **mesmo padrão visual** das demais telas analíticas do app (PageHeader + FilterPanel + KPIs + DataTable + PaginationControl + ExportButton), reaproveita autenticação Bearer existente (`api.get` em `src/lib/api.ts`), e integra-se ao menu/sidebar e ao sistema de permissões de rotas.

### Arquivos a criar/editar

**1. `src/pages/AuditoriaApontamentoGeniusPage.tsx` (novo)**
- Filtros: `data_ini`, `data_fim`, `numop`, `codori` (Combobox limitado às origens GENIUS), `codpro`, `operador`, `somente_discrepancia` (Switch), `somente_acima_8h` (Switch).
- Constante `ORIGENS_GENIUS = ['110','120','130','135','140','150','205','208','210','220','230','235','240','245','250']`.
- Estado: `filters`, `data`, `loading`, `pagina`, `endpointMissing`, `quickFilter` (filtro rápido local).
- Funções (nomes pedidos pelo usuário, exportadas como handlers internos):
  - `buscarAuditoriaApontamentoGenius(page)` → `api.get('/api/auditoria-apontamento-genius', {...filters, pagina, tamanho_pagina:100})`. Em 404 ativa `endpointMissing` e mostra Alert "Backend de Auditoria Apontamento Genius ainda não disponível" (mesmo padrão de `SugestaoMinMaxPage`).
  - `exportarAuditoriaApontamentoGeniusExcel()` → reaproveita `<ExportButton endpoint="/api/export/auditoria-apontamento-genius" params={filters} />`.
  - `limparTelaAuditoriaApontamentoGenius()` → reset de filtros e dados.
  - `aplicarFiltroListaApontGenius(rows, q)` → busca local em operador/OP/produto/origem/turno/status (memo).
  - `atualizarKpisApontGenius(rows, resumo)` → prioriza `data.resumo`; fallback agregando localmente.
  - `renderTabelaApontGenius()` → render via `<DataTable columns={columns} ... />`.

**2. KPIs (7 cards no topo)**
Total registros, Total discrepâncias, Sem início, Sem fim, Fim < Início, Acima de 8h, Maior total dia (operador). Usa `KPICard` com variantes `default`/`destructive`/`warning`/`info`.

**3. Tabela (colunas)**
Data, Origem, OP, Estágio, Seq. Roteiro, Seq. Apontamento, Usuário, Operador, Turno, Produto, Descrição, Hora início, Hora fim, Horas alocadas, Horas apontadas, Total dia operador, **Status** (Badge colorido).

Mapa de status → cores (Tailwind/HSL do design system):
| Status | Classe |
|---|---|
| `OK` | `bg-green-600 text-white` |
| `SEM_INICIO` | `bg-amber-500 text-white` |
| `SEM_FIM` | `bg-amber-500 text-white` |
| `FIM_MENOR_INICIO` | `bg-destructive text-destructive-foreground` |
| `APONTAMENTO_MAIOR_8H` | `bg-red-700 text-white` |
| `OPERADOR_MAIOR_8H_DIA` | `bg-red-700 text-white` |

Linha inteira recebe leve tint (`bg-destructive/5` ou `bg-amber-500/5`) quando status ≠ OK, para destacar discrepâncias.

**4. Filtro rápido local**
Input acima da tabela ("Pesquisar nesta página…" — debounce 300ms via mesmo padrão de `DataTable`/`useMemo`), filtra `enrichedData` por: operador, OP, produto, origem, turno, status. Resultado filtrado é o que vai para `<DataTable>`.

**5. Estados**
- Loading → `loading={loading}` no DataTable (skeleton já existente).
- Empty → DataTable já renderiza "Nenhum registro" quando vazio.
- Error/404 → `<Alert>` amarelo no topo: *"O backend desta auditoria ainda não está disponível. A tela ficará operacional assim que o ERP publicar `GET /api/auditoria-apontamento-genius`."* (mesmo componente Alert usado em SugestaoMinMaxPage).
- Sem mocks. Sem toggle demo.

**6. Tipo no `src/lib/api.ts` (editar)**
Adicionar interface:
```ts
export interface AuditoriaApontamentoGeniusResponse extends PaginatedResponse<any> {
  resumo?: {
    total_registros: number;
    total_discrepancias: number;
    sem_inicio: number;
    sem_fim: number;
    fim_menor_inicio: number;
    acima_8h: number;
    maior_total_dia_operador: number;
    operador_maior_total: string;
  };
}
```

**7. `src/App.tsx` (editar)**
Importar página e adicionar rota dentro do `<AppLayout>`:
```tsx
<Route path="/auditoria-apontamento-genius" element={<ProtectedRoute path="/auditoria-apontamento-genius"><AuditoriaApontamentoGeniusPage /></ProtectedRoute>} />
```

**8. `src/components/AppSidebar.tsx` (editar)**
Adicionar entrada na lista `modules`:
```ts
{ title: 'Auditoria Apont. Genius', url: '/auditoria-apontamento-genius', icon: ClipboardCheck }
```
Posicionada logicamente após "Auditoria Tributária".

**9. Documentação backend `docs/backend-auditoria-apontamento-genius.md` (novo)**
Contrato completo para o time FastAPI implementar:
- `GET /api/auditoria-apontamento-genius` — query params (`data_ini`, `data_fim`, `numop`, `codori`, `codpro`, `operador`, `somente_discrepancia`, `somente_acima_8h`, `pagina`, `tamanho_pagina`); response com `pagina/tamanho_pagina/total_registros/total_paginas/dados/resumo` exatamente como o frontend consome; tabelas-base sugeridas (E660APO/E660APP do Senior — apontamentos de produção); SQL exemplo com cálculo de `horas_apontadas = DATEDIFF(MINUTE, hora_inicio, hora_fim)/60.0`, `total_dia_operador = SUM() OVER (PARTITION BY operador, data)`, e CASE para `status`; filtro fixo de origens GENIUS (lista acima); pagination via `OFFSET/FETCH NEXT`.
- `GET /api/export/auditoria-apontamento-genius` — mesmos filtros, retorna `.xlsx` (StreamingResponse).
- Checklist de validação.

### Permissões (importante)
A rota `/auditoria-apontamento-genius` precisa ser cadastrada na tabela `profile_screens` (módulo de Configurações) para aparecer no menu para perfis sem `hasPermissions` total. Documentar isso no rodapé da nova tela como nota interna no commit. **Sem migração automática nesta tarefa** — admin cadastra via tela de Configurações existente.

### Fora de escopo
- Não alterar telas existentes além de App.tsx + AppSidebar.tsx + api.ts.
- Não criar dados mockados.
- Não implementar o backend FastAPI (somente documentação `docs/backend-auditoria-apontamento-genius.md`).
- Sem refatoração de `DataTable`, `FilterPanel`, `ExportButton` ou helpers de auth.

### Resultado esperado
Item "Auditoria Apont. Genius" no menu lateral → tela com banner amarelo "Backend pendente" enquanto endpoint não existir; assim que o FastAPI publicar a rota, KPIs/tabela populam automaticamente, com destaques visuais para apontamentos > 8h e totais diários > 8h.
