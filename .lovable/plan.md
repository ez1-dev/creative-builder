
## Diagnóstico

No Painel de Compras, os filtros **Projeto Macro**, **Tipo de Despesa**, **Mês de Competência** e **Cond. Pagamento** são **classificações calculadas no front-end** por `enrichRow()` em `src/lib/comprasClassificacao.ts` (regras com origem do material, número de projeto, descrição, etc.). O backend **não conhece** esses campos.

O que está acontecendo na tela mostrada:

1. `buildParams()` (linhas 156–175 de `src/pages/PainelComprasPage.tsx`) **envia** `tipo_despesa=Matéria-prima` para `/api/painel-compras-dashboard` e `/api/painel-compras`. O backend ignora ou trata como filtro inexistente — em ambos os casos os agregados retornam zerados / vazios.
2. Os cards do topo (`Total Comprado`, `Recebimento vs Pendência`, `Qtd OCs`, `Qtd Itens`, `Qtd Fornecedores`, `Maior Fornecedor`) são alimentados por `kpisGerencial` (linhas 519–575). Quando `dashboard` existe, ele usa `dashboard.kpis` **direto**, sem refazer a classificação client-side → tudo zera.
3. Já o bloco **"Indicadores Operacionais Detalhados"** usa o useMemo `kpis` (linhas 383–478) que **já trata** `gerencialActive` rodando `enrichRow` + filtro client-side sobre `data.dados`. Por isso ele mostra valores corretos (R$ 3.778,52, 3 itens pendentes, 2 fornecedores).
4. `gerencialCharts` (linhas 577–600) tem o mesmo problema do item 2.

Resumo: existe assimetria — KPIs operacionais detalhados respeitam filtros client-side, mas KPIs do topo + gráficos gerenciais confiam cegamente no `dashboard`/`graficos` do backend.

## Plano de correção

### 1. `src/pages/PainelComprasPage.tsx` — não enviar filtros client-side ao backend

Em `buildParams()`, **remover** do payload os campos que são puramente client-side, evitando que o backend devolva zero por causa de filtro desconhecido:

- `projeto_macro`
- `tipo_despesa`
- `mes_competencia`
- `condicao_pagamento`

(Eles continuam aplicados localmente via `enrichRow` + `filtroCliente`.)

### 2. `kpisGerencial` — recomputar client-side quando filtro gerencial está ativo

Mesma lógica já usada em `kpis` (linhas 383–478): se `gerencialActive`, **ignorar** `dashboard` e somar a partir de `dadosFiltrados` (que já vem de `dadosEnriquecidos`/`enrichRow` + `filtroCliente`). Continuar usando `dashboard` quando nenhum filtro gerencial estiver ativo.

### 3. `gerencialCharts` — mesma regra

Quando `gerencialActive`, derivar `porMes`, `porTipoDespesa`, `porCentroCusto`, `porProjeto` a partir de `dadosFiltrados`, não de `dashboard.graficos`.

### 4. Aviso de amostragem

Quando estivermos no caminho client-side e `data.total_registros > data.dados.length` (e não existir `dadosAgregados` cobrindo tudo), exibir o aviso já existente de amostragem (`amostragemAtivaCompras`) também para esse cenário, para o usuário saber que os totais podem estar limitados pela paginação carregada.

### 5. Documentação

Atualizar `docs/backend-painel-compras-dashboard.md` adicionando uma nota: `projeto_macro`, `tipo_despesa`, `mes_competencia` e `condicao_pagamento` **não** são enviados ao backend — são classificações derivadas no frontend.

## Resultado esperado

Com o filtro `Tipo de Despesa = Matéria-prima` + `Somente pendentes`:
- Total Comprado, Qtd OCs/Itens/Fornecedores, Maior Fornecedor e barra Recebimento vs Pendência passam a refletir as mesmas linhas mostradas em "Indicadores Operacionais Detalhados" (R$ 3.778,52, 2 OCs, 3 itens, 2 fornecedores no exemplo da tela).
- Gráficos do dashboard gerencial (`Por Mês`, `Por Tipo de Despesa`, `Por Centro de Custo`, `Top Projetos`) também passam a respeitar o filtro client-side.

## Arquivos afetados

- `src/pages/PainelComprasPage.tsx`
- `docs/backend-painel-compras-dashboard.md`
