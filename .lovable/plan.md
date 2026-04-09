

# Drill-down nos KPIs das Páginas de Produção

## Escopo

Três páginas de produção possuem KPIs sem drill-down. As páginas NaoCarregados, LeadTime e Engenharia x Produção não possuem KPIs, portanto ficam fora do escopo.

## Implementação

### 1. ProduzidoPeriodoPage (4 KPIs)

Usar `data.dados` (página atual) para gerar drill-downs:

- **Total Registros** — top 10 clientes por quantidade de registros
- **Qtd Produzida** — top 10 projetos por `quantidade_produzida`
- **Peso Produzido** — top 10 projetos por `peso_real`
- **Qtd Etiquetas** — top 10 projetos por `quantidade_etiquetas`

Labels: `Proj {numero_projeto} / Des {numero_desenho}`, values formatados.

### 2. ExpedidoObraPage (4 KPIs)

Usar `data.dados` para:

- **Total Registros** — top 10 clientes por registros
- **Qtd Expedida** — top 10 projetos por `quantidade_expedida`
- **Peso Expedido** — top 10 projetos por `peso_real`
- **Cargas Distintas** — top 10 cargas com motorista e placa

Labels para cargas: `Carga {numero_carga} - {motorista}`.

### 3. SaldoPatioPage (4 KPIs)

Usar `data.dados` para:

- **Total Registros** — breakdown por `status_patio` (contagem por status)
- **Kg Produzido** — top 10 projetos por `kg_produzido`
- **Kg Expedido** — top 10 projetos por `kg_expedido`
- **Kg em Pátio** — top 10 projetos por `kg_patio`

### Padrão de helper

Cada página terá um `useMemo` com helpers locais que agrupam/ordenam `data.dados` e retornam `{ label, value }[]` para a prop `details` do `KPICard`. Tooltips descritivos serão adicionados a todos os KPIs.

### Arquivos modificados
- `src/pages/producao/ProduzidoPeriodoPage.tsx`
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`

