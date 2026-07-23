## Painel de Compras — ajustes 22/07/2026

Dois ajustes pequenos em `src/pages/PainelComprasPage.tsx`. Item 3 (toggle "Incluir canceladas") fica de fora — foi marcado como opcional pelo backend e não faz parte deste escopo.

### 1. "Somente pendentes" começa desmarcado

Hoje o filtro inicia como `somente_pendentes: true` (linhas 155 e 358 do estado inicial e do reset), o que faz o front enviar o parâmetro explicitamente na carga inicial e reduz o painel a ~10% das compras.

- Trocar o default de `somente_pendentes` de `true` para `false` no estado inicial e no reset (`limparFiltros`).
- Nenhuma outra mudança na montagem de params: quando `false`, o código já não envia (só envia quando marcado ou quando a lógica de "Liquidado" força string `'false'`).
- Efeito colateral esperado (correto): o chip "FILTROS ATIVOS: Somente pendentes" some da carga inicial; o gráfico "Recebimento vs Pendência" e os KPIs passam a refletir toda a base.

### 2. Card "Maior Fornecedor" — usar top de `top_fornecedores`

O card lê `dashboard.kpis.maior_fornecedor`, que hoje volta zerado, e por isso mostra R$ 0,00 enquanto o gráfico "Top Fornecedores" (que consome `dashboard.graficos.por_fornecedor`) mostra o valor certo.

- Inverter a prioridade em `kpisGerencial` (linhas 571-578): primeiro pegar o maior de `dashboard.graficos.por_fornecedor` (mesma fonte do gráfico); só cair em `k.maior_fornecedor` se aquela lista vier vazia.
- Manter o formato `{ nome, valor }` já consumido pelo `KpiCard` "Maior Fornecedor".

### Fora do escopo (confirmação)

- Toggle "Incluir canceladas" (`incluir_canceladas=true`) — opcional, não implementar agora.
- Exclusão de canceladas nos totais, paridade dashboard×lista e reclassificação de "Tipo de despesa" — entram sozinhos no restart do backend.
- OCs antigas com atraso de 7250 dias e cadastro de projeto — questões cadastrais no ERP, não são código.
