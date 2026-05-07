## Demonstrativo de Compras e Recebimentos

Nova página gerencial em `/demonstrativo-compras-recebimentos`, consumindo um único endpoint backend `/api/demonstrativo-compras-recebimentos` (a ser criado/disponibilizado pelo backend FastAPI conforme contrato abaixo). Reaproveita componentes visuais já existentes (PageHeader, FilterPanel, KPICard, DataTable, ExportButton, ComboboxFilter, recharts).

### Arquivos a criar/alterar

**Novos:**
- `src/pages/DemonstrativoComprasRecebimentosPage.tsx` — página principal com 3 abas (Compras / Recebimentos / Comparativo), filtros globais, KPIs, gráficos, tabela drill-down + breadcrumb e tabela detalhe.
- `src/components/demonstrativo/DrillTable.tsx` — tabela de drill genérica (clica linha → próximo nível).
- `src/components/demonstrativo/DrillBreadcrumb.tsx` — breadcrumb clicável para voltar níveis.
- `src/components/demonstrativo/ComparativoCharts.tsx` — gráficos de barras por mês, pizza por tipo de despesa, ranking de fornecedores.

**Alterar:**
- `src/lib/api.ts` — adicionar tipos `DemonstrativoResponse`, `DemonstrativoNivel` (tipo união) e helper opcional.
- `src/App.tsx` — registrar a rota `/demonstrativo-compras-recebimentos` dentro de `AppLayout` com `ProtectedRoute`.
- `src/components/AppSidebar.tsx` — novo grupo colapsável "Dashboard" (ou item solto, ver pergunta abaixo) com entrada "Compras e Recebimentos" (ícone `BarChart3`/`Receipt`).
- `src/lib/screenCatalog.ts` — registrar a nova tela para gestão de permissões.

### Filtros globais (compartilhados pelas 3 abas)

Projeto macro (`Genius` | `Estrutural` | `Outros` | `TODOS`), Projeto, Centro de custo, Tipo de despesa (`Matéria-prima` | `Uso e consumo` | `Despesas gerais` | `Serviços`), Descrição da compra, Mês (YYYY-MM), Fornecedor (ComboboxFilter via `useFornecedores`), Condição de pagamento, Transação NF, Período inicial, Período final. Botão "Limpar filtros".

Os filtros vivem em estado único; ao mudar de aba, são preservados e enviados ao endpoint apenas trocando `origem` (`COMPRAS` / `RECEBIMENTOS` / `TODOS`).

### KPIs (cards no topo, mesmo `KPICard` do projeto)

Total comprado, Total recebido, Saldo pendente, Diferença comprado x recebido, Qtd. documentos, Qtd. fornecedores. Valores vindos de `response.kpis`. Formato R$ pt-BR.

### Drill-down

Sequência fixa de níveis:

```text
projeto_macro → numero_projeto → centro_custo → tipo_despesa → mes_competencia → fornecedor → documento → item
```

Estado local `nivelStack: Array<{nivel, valor, label}>`. Ao clicar uma linha do `DrillTable`, push no stack e refetch enviando `nivel = proximo_nivel` + chave do nível anterior como filtro adicional. `DrillBreadcrumb` exibe o caminho e permite voltar (pop até o índice clicado). Aba Comparativo usa o mesmo drill com `origem=TODOS`.

### Abas

- **Compras** (`origem=COMPRAS`): KPIs filtrados a Compras, gráfico de barras "Valor comprado por mês", tabela drill-down + tabela detalhe com colunas: Projeto, CC, Tipo despesa, Descrição, Mês, Fornecedor, Cond. pagto, Nº OC, Item, Quantidade, Valor comprado, Valor pendente.
- **Recebimentos** (`origem=RECEBIMENTOS`): KPIs filtrados a Recebimentos, gráfico de barras "Valor recebido por mês", tabela drill-down + detalhe: Projeto, CC, Tipo despesa, Descrição, Mês, Fornecedor, Transação NF, Cond. pagto, Nº NF, Série, Item, Quantidade, Valor recebido, OC origem.
- **Comparativo** (`origem=TODOS`): cards extras (Comprado pendente de recebimento, Recebido sem OC), barras agrupadas Comprado x Recebido por mês, pizza por tipo de despesa, ranking top fornecedores (barras horizontais), tabela drill-down comparativa com colunas Comprado, Recebido, Diferença, % atendimento.

### Export

Botão `ExportButton` por aba apontando para `/api/export/demonstrativo-compras-recebimentos` enviando os filtros + `origem` atual. Se o backend ainda não tiver o export, fallback gera CSV no cliente a partir de `detalhe`.

### Estados

Loading (skeleton nos cards e tabela), erro (`ErpConnectionAlert` + toast), vazio ("Sem dados para os filtros aplicados"). Tudo formatado em pt-BR (`formatCurrency`, `formatDate`, `formatNumber`).

### Contrato esperado do endpoint (backend FastAPI)

`GET /api/demonstrativo-compras-recebimentos` com query params: `origem`, `nivel`, `projeto_macro`, `numero_projeto`, `centro_custo`, `tipo_despesa`, `descricao_item`, `mes_competencia`, `fornecedor`, `condicao_pagamento`, `transacao`, `data_ini`, `data_fim`. Retorno:

```json
{
  "nivel": "projeto_macro",
  "proximo_nivel": "numero_projeto",
  "kpis": { "valor_comprado": 0, "valor_recebido": 0, "valor_pendente": 0,
            "diferenca_comprado_recebido": 0, "qtd_linhas": 0,
            "qtd_documentos": 0, "qtd_fornecedores": 0 },
  "drill": [ { "chave": "GENIUS", "label": "GENIUS",
               "valor_comprado": 0, "valor_recebido": 0,
               "valor_pendente": 0, "qtd_documentos": 0 } ],
  "detalhe": []
}
```

Será criado um doc `docs/backend-demonstrativo-compras-recebimentos.md` descrevendo o contrato para o time de backend.

### Segurança / padrões

- Usa `api.get` existente (JWT + ngrok header já tratados).
- Tokens semânticos do design system (sem cores hardcoded).
- Sem dados mockados — se o endpoint responder 404/erro, exibir `ErpConnectionAlert` com instrução para subir o backend.

### Pergunta antes de implementar

Antes de implementar, preciso confirmar 1 ponto de UX no menu lateral.
