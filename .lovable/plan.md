

## Migrar tela para endpoint `/api/apontamentos-producao`

### Escopo
Religar a tela `/auditoria-apontamento-genius` ao endpoint já publicado no ERP e adequar os campos do contrato novo. Remover qualquer fallback de "backend não publicado".

### Mudanças

**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. **Endpoints**
   - Trocar `api.get('/api/auditoria-apontamento-genius', …)` por `api.get('/api/apontamentos-producao', …)`.
   - Trocar `ExportButton endpoint="/api/export/auditoria-apontamento-genius"` por `endpoint="/api/export/apontamentos-producao"`.

2. **Remover fallback de backend ausente**
   - Eliminar state `endpointMissing`, bloco `<Alert>` "Backend pendente", `useEffect` que reseta, branch `is404` no catch e a função `is404`.
   - O catch passa a apenas exibir `toast.error(e.message)`.
   - `emptyMessage` da `DataTable` volta a ser fixo: `'Nenhum apontamento encontrado para os filtros.'`.

3. **Renomear campos no contrato (em todo o arquivo)**
   - `horas_apontadas` → `horas_realizadas`
   - `status_apontamento` → `status_movimento`
   - `nome_usuario` → `nome_operador`
   - `codigo_usuario` → `numcad`
   - `data_apontamento` → `data_movimento`
   - `hora_inicio` / `hora_fim` → `hora_movimento` (única coluna na grid e no drawer)
   - Aplicar nas colunas (`buildColumns`), no `quickFilter`, no `rowClassName`, nos cálculos de KPI (`atualizarKpisApontGenius`), no `apontamentosDaOp`, em `totaisApontamentosDaOp` e na tabela do drawer.

4. **Grid (ordem das colunas após `numero_op` sticky e `origem`)**
   - `data_movimento` (Data) · `hora_movimento` (Hora) · `nome_operador` (Operador, fallback `— (cód: {numcad})`) · `estagio` · `seqrot` · `seq_apontamento` · `numcad` · `turno` · `codigo_produto` · `descricao_produto` · `horas_realizadas` (zero em vermelho) · `total_horas_dia_operador` · `status_op` · `status_movimento`.

5. **Drawer**
   - Tabela compacta passa a ter colunas: Data (`data_movimento`), Hora (`hora_movimento`), Horas (`horas_realizadas`), Operador (`nome_operador` / fallback `numcad`), Status (`status_movimento`).
   - Texto do alerta amarelo interno trocado para "Apontamentos sem horas vinculadas — verifique o backend `/api/apontamentos-producao`".

6. **Alerta global "todos zerados"**
   - Mantém a heurística, mas ajustada para `horas_realizadas`. Texto atualizado para referenciar `/api/apontamentos-producao` em vez do endpoint antigo. Remover menção a `docs/backend-auditoria-apontamento-genius.md`.

7. **Tipos (`src/lib/api.ts`)**
   - Sem alterações de tipos: o contrato continua chegando como `any[]` em `dados`. Apenas o nome dos campos consumidos no componente muda. `AuditoriaApontamentoGeniusResponse` é mantido (estrutura paginada + `resumo` + `debug`).

### Fora de escopo
- Backend.
- Reescrita dos KPIs/cálculos de discrepância (lógica preservada, só renomeio de chaves).
- Mudança visual de cores ou layout.

### Resultado
A tela passa a consumir o endpoint correto já publicado, exibe os campos no novo contrato (`horas_realizadas`, `status_movimento`, `nome_operador`, `numcad`, `data_movimento`, `hora_movimento`) e deixa de mostrar qualquer mensagem de "backend não publicado".

