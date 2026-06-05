## Objetivo

No dashboard de Manutenção de Frota, permitir que cada gráfico (Adicionar/Configurar) escolha livremente:

- **Dimensão**: Placa, Fornecedor, Descrição, Motorista, Centro de Custo, Segmento, Tipo de Veículo, Mês (evolução).
- **Métrica**: Valor (R$), % do total (em valor), Quantidade de manutenções, KM (soma), KM (média), Ticket médio (R$/manutenção), R$ por KM.
- **Visualização**: Barras (ranking Top N), Pizza/Donut, Linha (evolução mensal), Tabela agregada.

Mantém o layout customizável atual; nada muda no banco e nada muda no backend FastAPI — toda a agregação continua client-side sobre `crossFiltered`.

## Como vai funcionar (técnico)

A biblioteca BI já renderiza widgets a partir de `seriesPayload` (mapa `chave → [{name,value}]`) via `componentRegistry`. Cada widget guarda `componentId` (bar/pie/line/table) + `mapping.series = "<chave>"`. Hoje as chaves são fixas (`por_segmento`, `top_veiculos`, etc.).

Vamos **gerar dinamicamente** todas as combinações dimensão×métrica em `seriesPayload`, e o `ConfigureChartDialog`/`AddChartDialog` (que já leem `seriesOptions` do `PageDataContext`) passarão a oferecê-las automaticamente.

### 1. `src/components/frota/FrotaDashboard.tsx`

- Definir constantes:
  ```ts
  const DIMENSOES = [
    { key: 'placa', label: 'Placa', get: r => r.placa || '—' },
    { key: 'fornecedor', label: 'Fornecedor', get: r => r.fornecedor || '—' },
    { key: 'descricao', label: 'Descrição', get: r => r.descricao || '—' },
    { key: 'motorista', label: 'Motorista', get: r => r.motorista || '—' },
    { key: 'centro_custo', label: 'Centro de Custo', get: r => r.centro_custo || '—' },
    { key: 'segmento', label: 'Segmento', get: r => r.segmento || 'NÃO INFORMADO' },
    { key: 'tipo_veiculo', label: 'Tipo de Veículo', get: r => r.tipo_veiculo || 'NÃO INFORMADO' },
  ];
  const METRICAS = [
    { key: 'valor', label: 'Valor (R$)', agg: 'sum_valor' },
    { key: 'pct',   label: '% do total (valor)', agg: 'pct_valor' },
    { key: 'qtd',   label: 'Quantidade', agg: 'count' },
    { key: 'km_sum', label: 'KM (soma)', agg: 'sum_km' },
    { key: 'km_avg', label: 'KM (média)', agg: 'avg_km' },
    { key: 'ticket', label: 'Ticket médio (R$/manut.)', agg: 'avg_valor' },
    { key: 'rs_km', label: 'R$ por KM', agg: 'valor_por_km' },
  ];
  ```
- Função `aggregate(rows, dim, met)` que retorna `[{name, value}]` aplicando a métrica (soma, contagem, média, razão, %). Para `pct` calcula soma de valor por categoria / total.
- Função `aggregateMensal(rows, met)` análoga, agrupando por `r.mes` na ordem `MESES_ORDER`.
- Substituir o `seriesPayload` fixo por construção dinâmica:
  ```ts
  const seriesPayload = useMemo(() => {
    const out: Record<string, {name:string;value:number}[]> = {};
    DIMENSOES.forEach(d => METRICAS.forEach(m => {
      out[`por_${d.key}__${m.key}`] = aggregate(crossFiltered, d, m);
    }));
    METRICAS.forEach(m => {
      out[`mensal__${m.key}`] = aggregateMensal(crossFiltered, m);
    });
    // manter aliases das chaves antigas para não quebrar widgets já salvos
    out.evolucao_mensal = out['mensal__valor'];
    out.por_segmento     = out['por_segmento__valor'];
    out.top_veiculos     = out['por_placa__valor'];
    out.top_fornecedores = out['por_fornecedor__valor'];
    out.top_centros_custo= out['por_centro_custo__valor'];
    out.top_motoristas   = out['por_motorista__valor'];
    out.por_tipo_veiculo = out['por_tipo_veiculo__valor'];
    return out;
  }, [crossFiltered]);
  ```
- Atualizar o `schema` passado para `PageDataProvider` (lista de `seriesOptions`) para incluir rótulos legíveis das novas chaves, formato `"<Dimensão> · <Métrica>"` e `"Evolução mensal · <Métrica>"`. Isso é o que aparece no seletor "Série" do `ConfigureChartDialog`.
- Cross-filter: o `onItemClick` do `componentRegistry` usa o nome da série para resolver a dimensão. Vamos manter o mapa: extrair o prefixo `por_<dim>__` ou os aliases antigos. Adicionar um helper local `seriesKeyToDim(key)` e usá-lo quando registramos os handlers (se a infra de click vier do `componentRegistry`, basta os aliases já cobrirem o caso clássico; novas chaves cross-filtram pela dimensão correspondente).

### 2. Nenhuma alteração em

- `ConfigureChartDialog` / `AddChartDialog` — já listam dinamicamente as séries do `PageDataContext`.
- `componentRegistry` — bar/pie/line/table já existem (`bar-chart`, `pie-chart`, `line-chart`, `data-table` ou equivalente). Apenas confirmar nomes no diálogo.
- Backend, ETL, Cloud, edge functions — fora de escopo.

### 3. Compatibilidade

- Widgets já salvos (`top_veiculos`, `por_segmento`, etc.) continuam funcionando pelos aliases.
- "% do total" é calculado na série (`value` em 0–100); para o gráfico de pizza isso é equivalente a usar valor puro (a pizza normaliza), mas o tooltip mostrará a métrica escolhida.

## Critério de aceite

- No diálogo "Adicionar gráfico" o seletor de série lista todas as combinações dimensão × métrica (incluindo "Evolução mensal · …").
- Em "Configurar gráfico" sobre um card existente, é possível trocar a dimensão e a métrica e o card se atualiza.
- Tipos de gráfico disponíveis: Barras, Pizza/Donut, Linha, Tabela.
- Cross-filter dos cards continua funcionando para placa, fornecedor, CC, motorista, segmento, tipo e mês.
- Layouts já salvos continuam abrindo (aliases preservados).
- Sem alterações no backend, Cloud ou tabelas.

## Fora de escopo

- Página de Manutenção de Máquinas (mesmo padrão poderia ser replicado depois, se quiser).
- Novos componentes visuais além dos já registrados na biblioteca BI.
