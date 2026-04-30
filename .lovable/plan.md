## Ajuste nos filtros do dashboard de Passagens Aéreas

Hoje a barra de filtros tem um campo **"Tipo"** que filtra por `tipo_despesa`. Vou:

1. **Renomear esse filtro** para **"Motivo da Viagem"** e fazê-lo filtrar pelo campo `motivo_viagem`.
2. **Adicionar um novo filtro "Tipo"** logo ao lado, que continua filtrando por `tipo_despesa` (igualzinho ao comportamento que o filtro tinha antes).

Ambos serão **combobox com opção "todos"**, populados com os valores distintos existentes na base.

### Alterações

Arquivo único: `src/components/passagens/PassagensDashboard.tsx`

1. Renomear o estado `filtroTipo` → `filtroMotivo` e adicionar novo estado `filtroTipo` (ainda chamado assim, mas agora dedicado a `tipo_despesa`).
2. Construir lista de motivos distintos a partir de `data` (`motivo_viagem` não-vazio, ordenados, deduplicados) — análogo ao que já é feito para outros campos.
3. Atualizar a função de filtragem (`displayRows`):
   - `filtroMotivo !== 'todos'` → comparar com `r.motivo_viagem`.
   - `filtroTipo !== 'todos'` → continuar comparando com `r.tipo_despesa` (usando `TIPO_DESPESA_OPTIONS` no select).
4. Na barra de filtros (linha ~541):
   - Trocar o label do Select existente para **"Motivo da Viagem"** e usar a lista de motivos distintos.
   - Inserir, logo após, um novo Select **"Tipo"** com `TIPO_DESPESA_OPTIONS`.
5. Atualizar `hasTopFilter`, `countAtivos` e `clearFilters` para considerar os dois filtros.
6. Manter o restante (KPIs, tabela, exportações, paginação, agrupamentos) inalterado.

### Fora do escopo

- Não mexer em paginação, subtotal, agrupamentos, ordenação ou KPIs.
- Não alterar schema do banco nem exportações.
