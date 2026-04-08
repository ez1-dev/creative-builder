

# Adicionar KPIs Client-Side nas Paginas de Consulta

## O que sera feito
Adicionar uma faixa de KPI cards calculados a partir dos dados da pagina atual (`data.dados`) em tres paginas: Produzido, Expedido e Saldo em Patio. Os KPIs serao computados via `useMemo` sobre o array de registros retornado pela API.

## KPIs por Pagina

### Produzido no Periodo
- **Total Registros**: contagem de `dados.length` (pagina atual)
- **Qtd Produzida**: soma de `quantidade_produzida`
- **Peso Produzido (Kg)**: soma de `peso_real`
- **Qtd Etiquetas**: soma de `quantidade_etiquetas`

### Expedido para Obra
- **Total Registros**: contagem de `dados.length`
- **Qtd Expedida**: soma de `quantidade_expedida`
- **Peso Expedido (Kg)**: soma de `peso_real`
- **Cargas Distintas**: contagem distinta de `numero_carga`

### Saldo em Patio
- **Total Registros**: contagem de `dados.length`
- **Kg Produzido**: soma de `kg_produzido`
- **Kg Expedido**: soma de `kg_expedido`
- **Kg em Patio**: soma de `kg_patio`

## Implementacao Tecnica

### Cada pagina recebera:
1. Import de `useMemo` e `KPICard` + icones lucide-react relevantes
2. Um bloco `useMemo` que agrega os dados do array `data?.dados || []`
3. Um grid de 4 KPICards posicionado entre o FilterPanel e o DataTable
4. KPIs so aparecem quando `data` nao e null (apos pesquisa)
5. Subtitulo "na pagina atual" para deixar claro que e sobre os registros visíveis

### Padrao visual
- Grid: `grid grid-cols-2 md:grid-cols-4 gap-4`
- Variantes: default para contagens, info/success/warning para metricas de peso
- Animacao staggered via prop `index` do KPICard (ja suportado)

### Arquivos afetados
- `src/pages/producao/ProduzidoPeriodoPage.tsx`
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`

