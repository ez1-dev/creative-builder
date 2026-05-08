## Objetivo
Permitir que o "Editar layout" do dashboard `/passagens-aereas` movimente e redimensione **cada gráfico individualmente**, em vez de tratar todos como um único bloco "charts-row".

## Situação atual
Hoje o grid tem só **3 blocos** que podem ser movidos/redimensionados:
- `kpis-row` (todos os KPIs juntos)
- `charts-row` (5 gráficos travados num grid interno fixo)
- `tabela-registros`

No modo "Editar layout" o usuário consegue mover apenas os 3 blocos — não tem como, por exemplo, deixar "Evolução Mensal" ocupando 12 colunas em cima e os outros 4 gráficos abaixo em 3 colunas cada.

## Mudança proposta
Quebrar o `charts-row` em **5 blocos independentes**, cada um arrastável e redimensionável:
- `chart-evolucao-mensal` (Evolução Mensal)
- `chart-motivo-viagem` (Por Motivo de Viagem)
- `chart-top-cc` (Top Centros de Custo)
- `chart-top-cidades` (Top Cidades de Destino)
- `chart-top-uf` (Top Estados/UF de Destino)

Continuam existindo `kpis-row` e `tabela-registros` como blocos próprios.

Layout default sugerido (grid de 12 colunas):
```text
y=0  kpis-row              w=12 h=3
y=3  chart-evolucao-mensal w=6  h=8
y=3  chart-motivo-viagem   w=6  h=8
y=11 chart-top-cc          w=12 h=8
y=19 chart-top-cidades     w=6  h=8
y=19 chart-top-uf          w=6  h=8
y=27 tabela-registros      w=12 h=10
```

## Onde mexer

### 1. `src/components/passagens/PassagensDashboard.tsx`
- No mapa `blocks` que hoje tem `'charts-row'`: remover essa entrada e criar 5 entradas (`chart-evolucao-mensal`, `chart-motivo-viagem`, `chart-top-cc`, `chart-top-cidades`, `chart-top-uf`), cada uma renderizando **apenas o `<Card>` correspondente** (sem o `<div className="grid …">` externo).
- A `VisualGate` de cada card passa a usar uma chave própria (ex.: `passagens.chart-evolucao-mensal`) — manter o agrupamento atual `passagens.kpis-charts` como fallback de leitura para não quebrar permissões existentes.

### 2. `src/hooks/usePassagensLayout.ts`
- Substituir em `PASSAGENS_DEFAULT_WIDGETS` o item `charts-row` pelos 5 novos itens com o layout sugerido acima e `position` recalculado.
- `mergeWithDefaults` já lida com falta de tipos no banco, então usuários antigos pegam o default automaticamente.

### 3. `src/lib/visualCatalog.ts`
- Adicionar as 5 chaves `passagens.chart-*` para aparecerem no painel de permissões visuais.

### 4. Banco (migration)
- Reescrever `upsert_passagens_dashboard_default()`: lista canônica passa a ser `kpis-row + 5 charts + tabela-registros` (com x/y/w/h conforme acima).
- `DELETE FROM dashboard_widgets WHERE type='charts-row'` para limpar widgets antigos do default.
- Chamar `upsert_passagens_dashboard_default()` para repovoar.

### 5. `PassagensLayoutGrid.tsx`
- Sem mudanças estruturais — ele já desenha um bloco por widget. Só vai passar a receber 7 blocos em vez de 3.

## Fora do escopo (só pra confirmar)
- **Não** estou tornando o layout "por usuário" agora (sua pergunta anterior ficou ambígua). Continua um layout só, gerenciado pelo admin via "Editar layout". Se quiser também tornar individual por usuário, me avise que faço num passo seguinte.
- **Não** estou quebrando os KPIs em 4 cards independentes — só os gráficos. Posso fazer com os KPIs depois se quiser.