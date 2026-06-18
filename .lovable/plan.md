
# Módulo "DRE Configurável" — BI Financeiro

O Lovable atua apenas como interface: consome endpoints FastAPI, exibe resultados, aplica filtros e configura modelos. Nenhum cálculo contábil, nenhuma regra de encerramento, nenhum acesso direto ao ERP, nenhuma leitura de valores da DRE no Cloud.

## Escopo desta entrega

Implementar somente a **Tela 1 — Painel DRE Realizada**, mais o item de menu e a estrutura base de rotas/API client. As telas 2 a 5 (drill por conta, drill por lançamento, configurador de modelo, regras de conta) ficam para entregas seguintes, mas a navegação já reserva os pontos de entrada.

## 1. Estrutura de arquivos

```text
src/
  pages/
    bi/
      financeiro/
        DreConfiguravelPainelPage.tsx     (novo — Tela 1)
  lib/
    bi/
      dreConfiguravelApi.ts               (novo — client FastAPI)
      dreConfiguravelTypes.ts             (novo — tipos do contrato)
  components/
    bi/
      financeiro/
        DreFiltrosBar.tsx                 (novo — filtros da tela)
        DreResumoCards.tsx                (novo — 5 KPIs)
        DreMensalChart.tsx                (novo — gráfico mensal)
        DreMensalTable.tsx                (novo — tabela mensal)
```

Rotas adicionadas em `src/App.tsx`:

- `/bi/financeiro/dre-configuravel` → Painel DRE Realizada

Menu (em `src/components/AppSidebar.tsx`) — novo grupo **BI Financeiro** com filho **DRE Configurável**. Catálogo de telas atualizado em `src/lib/screenCatalog.ts` (`BI_FIN_DRE_CFG`).

## 2. API client (`dreConfiguravelApi.ts`)

Usa `getApiUrl()` + `api.getToken()` + header `ngrok-skip-browser-warning: true` (mesmo padrão de `dreConfigApi.ts`).

Endpoints chamados nesta tela:

- `GET /api/dre/realizado/resumo`
  - Query: `empresa`, `filial`, `data_ini` (YYYY-MM-DD), `data_fim` (YYYY-MM-DD), `modelo_id`, `tipo` (`MENSAL` | `ACUMULADO`), `comparar_orcamento` (bool).
  - Resposta esperada: `{ totais: { receita_operacional, custos, despesas, resultado_dre, margem_pct }, mensal: [{ anomes, receita_operacional, receita_bruta, deducoes, custos, despesas, receitas_nao_operacionais, resultado_dre }] }`.
- `GET /api/dre/modelos` — para popular o select "Modelo DRE".
- (Reservado, não consumido nesta tela ainda) `GET /api/dre/realizado/contas` — drill por conta.

Os tipos exatos de payload ficam em `dreConfiguravelTypes.ts` e podem ser ajustados se o backend retornar nomes ligeiramente diferentes. O front normaliza valores numéricos com a mesma estratégia já usada (`toNumberBI` pode ser reaproveitada/importada).

## 3. Tela 1 — Painel DRE Realizada

### 3.1 Filtros (`DreFiltrosBar`)

- Empresa (select) — opções via hook existente `useErpOptions` se já cobrir empresas; senão endpoint dedicado a definir com backend.
- Filial (select dependente de empresa).
- Período inicial / Período final (datepickers, padrão shadcn).
- Modelo DRE (select alimentado por `GET /api/dre/modelos`).
- Tipo: Mensal / Acumulado (toggle).
- Comparar com orçamento: Sim / Não (switch).
- Botões: **Aplicar**, **Limpar**.

Default: mês corrente, tipo Mensal, comparar orçamento Não, primeiro modelo retornado.

### 3.2 Cards (`DreResumoCards`)

Usar `KpiGrid` + `KpiCard` da biblioteca `@/components/bi`. Cinco cards:

1. Receita Operacional (currency)
2. Custos (currency)
3. Despesas (currency)
4. Resultado DRE (currency, cor por sinal)
5. Margem % (percent)

### 3.3 Gráfico mensal (`DreMensalChart`)

`LineChartCard` (ou `ComboChartCard`) da biblioteca BI, séries: Receita Operacional, Custos, Despesas, Resultado DRE, eixo X = ANOMES formatado `MM/YYYY`.

### 3.4 Tabela mensal (`DreMensalTable`)

`DataTableBI` com colunas: ANOMES, Receita Operacional, Receita Bruta, Deduções, Custos, Despesas, Receitas Não Operacionais, Resultado DRE. Linha clicável que dispara handler `onSelecionarMes(anomes)` — por enquanto apenas registra um TODO/console preparando o drill por conta da Tela 2 (não navega ainda).

### 3.5 Estados

- Loading: `LoadingState`.
- Erro: `ErrorState` com mensagem do backend.
- Sem dados: `NoDataState` ("Sem lançamentos no período").

## 4. Restrições / não-fazer

- Nenhum cálculo de DRE no front (cards/gráfico/tabela exibem o que o backend retorna).
- Sem acesso ao Cloud para valores da DRE — Cloud continua só para auth/tracking/log.
- Sem regra de lote de encerramento, sem hardcode de lote 16090, sem classificação contábil local.
- Sem reaproveitar `dreMontadorApi.ts` ou `dreDinamicaApi.ts` (módulos distintos, contratos distintos).

## 5. Documentação backend

Criar `docs/backend-bi-financeiro-dre-configuravel.md` listando os endpoints consumidos (resumo, contas, lançamentos, modelos, linhas, regras-contas), exemplos de request/response e contrato dos filtros. Serve de fonte da verdade para o time do FastAPI.

## 6. Próximas entregas (fora deste plano)

- Tela 2: Drill-down por conta (modal sobre clique em linha de grupo).
- Tela 3: Drill-down por lançamento.
- Tela 4: Configurador visual de modelo DRE (linhas, grupos, subtotais, fórmulas, negrito, base %).
- Tela 5: Regras de conta por linha (máscara, conta exata, intervalo, exclusão, sinal).

## Critérios de aceite (Tela 1)

- Menu **BI Financeiro → DRE Configurável** visível no sidebar.
- Rota `/bi/financeiro/dre-configuravel` renderiza o painel.
- Filtros disparam um único `GET /api/dre/realizado/resumo` com os parâmetros corretos.
- Cards, gráfico e tabela mensal são preenchidos a partir da resposta do endpoint, sem cálculo local.
- Clique em linha da tabela é registrado (handler pronto para drill futuro), sem navegação ainda.
- Nenhuma chamada a Supabase para valores da DRE; nenhuma referência a lote 16090 ou regra de encerramento no código novo.
