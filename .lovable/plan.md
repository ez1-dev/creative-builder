
Objetivo: fazer os KPIs de "Produzido no Período" mostrarem o total consolidado do filtro, e não apenas os valores individuais da página atual.

1. Diagnóstico
- Hoje `src/pages/producao/ProduzidoPeriodoPage.tsx` soma `data.dados` diretamente:
  - `quantidade_produzida`
  - `peso_real`
  - `quantidade_etiquetas`
- Como `data.dados` contém só a página atual, os KPIs continuam parciais/individuais mesmo quando o filtro retorna várias páginas.

2. Implementação proposta
- Manter a tabela paginada como está.
- Separar os KPIs da lista visível:
  - criar um estado de resumo consolidado, por exemplo `kpiTotals`
  - criar um estado de carregamento separado, por exemplo `kpiLoading`
- Ao buscar os dados com os filtros:
  - usar a primeira resposta para descobrir `total_paginas`
  - calcular os totais gerais de todas as páginas com os mesmos filtros
  - somar:
    - `quantidade_produzida`
    - `peso_real`
    - `quantidade_etiquetas`
    - opcionalmente também `total_registros` a partir da própria API
- Exibir os KPIs usando esse resumo consolidado, e não mais `dados.reduce(...)` da página atual.

3. Estratégia de cálculo
- Prioridade 1: se o endpoint passar a devolver um `resumo`, consumir esse objeto direto.
- Prioridade 2: como hoje não há `resumo`, fazer agregação no frontend:
  - buscar as páginas restantes com os mesmos filtros
  - somar tudo em memória
- Para evitar recálculo desnecessário:
  - recalcular somente quando os filtros mudarem
  - não recalcular ao trocar de página da tabela, se o filtro for o mesmo

4. Proteções importantes
- Adicionar controle contra resposta antiga sobrescrever resposta nova:
  - usar um `requestId`/sequência interna ou comparação de filtro serializado
- Mostrar estado visual claro nos KPIs:
  - enquanto consolida: “Calculando total...”
  - depois: “Total geral do filtro”
- Se a consolidação falhar:
  - manter a tabela funcionando
  - mostrar aviso de que os KPIs ficaram indisponíveis temporariamente, em vez de exibir parcial sem contexto

5. Arquivo afetado
- `src/pages/producao/ProduzidoPeriodoPage.tsx`

6. Resultado esperado para o caso validado
- Com projeto `663` e desenho `4200`, o KPI de peso deve refletir o total consolidado do filtro (na faixa de ~33.720 Kg, conforme sua extração), e não apenas o valor individual/parcial da página atual.

Detalhes técnicos
```text
Fluxo desejado

Buscar página 1
  -> renderizar tabela
  -> descobrir total_paginas
  -> consolidar páginas 1..N
  -> atualizar KPIs com total geral

Tabela = página atual
KPI = total geral do filtro
```

- Também vou remover a lógica atual baseada em:
  - `const qtdProduzida = dados.reduce(...)`
  - `const pesoProduzido = dados.reduce(...)`
  - `const qtdEtiquetas = dados.reduce(...)`
  para que ela deixe de alimentar os cards principais.
