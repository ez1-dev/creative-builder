
## Objetivo

Na tela **01 — Resumo da Folha** (`/rh/resumo-folha`) o clique em qualquer card/KPI/gráfico/tabela deve abrir o drill correspondente. Hoje quase nada abre — precisamos descobrir por que os drills sumiram (não regredir o backend por conta própria) e, quando o backend confirmar que devolve o menu, garantir que 100% dos elementos visuais respondem ao clique.

## Diagnóstico da causa (a confirmar em runtime)

Toda a lógica de drill da tela depende de `data.drills_menu` vindo de `GET /api/rh/resumo-folha/dashboard` (normalizado em `src/lib/rh/api.ts:294`). Um card só fica clicável quando existe um item cujo `card` bate com o `field` do KPI (`kpiDrill` / `openDrill` em `ResumoFolhaPage.tsx:118-141`). Tabelas (Proventos, Descontos, Filial) e o donut de Tipos de Evento hoje **não são renderizados como clicáveis em nenhum cenário** — mesmo quando o backend mandava drill para eles.

Hipóteses a validar (ordem de investigação):

1. `drills_menu` está vindo `[]` ou ausente no payload atual (regressão no FastAPI).
2. `drills_menu` está vindo, mas com `card` diferente dos `field` dos KPIs (ex.: `salario_bruto` no front vs `salarioBruto` no backend).
3. Backend só mandava drill para alguns cards e o restante (tabelas/donut) nunca foi cabeado no front — vai parecer "sumiu" mesmo sem regressão.

## Escopo (confirmado com o usuário)

Cobrir drill em **todos os pontos visuais** da tela: KPIs, tabelas Proventos+Vantagens / Descontos / Filial, gráfico mensal (barras) e donut Tipos de Evento. Quando o backend não devolver `drills_menu` para algum item, **sinalizar como bug** — sem fallback silencioso.

## Entregas

### 1. Investigação (sem mexer no backend)
- Adicionar logging estruturado no console quando `drills_menu` chegar vazio ou parcial, listando os `field` esperados vs recebidos.
- Adicionar banner discreto (apenas para admin) no topo da tela quando `drills_menu.length === 0` ou quando faltar drill para KPIs conhecidos: "Drills do Resumo da Folha não foram devolvidos pelo backend — verifique `/api/rh/resumo-folha/dashboard`". Inclui botão *Copiar diagnóstico* (params + resposta bruta).
- Documentar em `docs/backend-etl-bi.md` (seção RH) o contrato esperado: `drills_menu[]` com `card`, `label`, `agrupamentos[]` e a lista de `card` que a tela consome hoje.

### 2. Cabear drill em todos os elementos visuais
Reaproveitar o `ResumoFolhaDrillDrawer` e o endpoint `GET /api/rh/resumo-folha/drill` (`fetchResumoFolhaDrill`) já existentes.

- **KPIs (linha superior)**: já existe wiring; garantir que Provento, Desconto, Total Líquido, Salário Base/Bruto, Outras Gratificações, Benefícios, V.A., INSS, FGTS, Rescisões, Custo Total, Hora Extra, Provisões, Custo das Férias tenham entrada em `drills_menu`. Onde faltar, banner do item 1 acusa.
- **Evolução mensal (gráfico de barras)**: clique numa barra (Provento/Desconto/Líquido de uma competência) abre drill com `card = provento|desconto|total_liquido` e filtro adicional `anomes_ini=anomes_fim=<competência>`.
- **Detalhamento mensal (tabela)**: cada célula de valor abre o mesmo drill do gráfico.
- **Proventos + Vantagens (tabela)**: cada linha vira botão; abre drill com `card = "proventos"`, `agrupar_por = "matricula"` (ou o que o backend expuser) e `cd_evento` como filtro extra.
- **Descontos (tabela)**: idem, `card = "descontos"`.
- **Filial (tabela)**: cada célula numérica vira clicável; envia `card = <coluna>` (ex.: `salario_base`, `custo_total`, `fgts`) + `cd_filial` da linha.
- **Tipos de Evento (donut)**: clique na fatia envia `card = "tipos_evento"` + `cd_tp_evento` da fatia.

Todos os handlers passam pelo mesmo `openDrill(field, extras?)` refatorado, que injeta filtros extras (`cd_filial`, `cd_evento`, `cd_tp_evento`, competência) no `ResumoFolhaDrillDrawer`.

### 3. UX de item sem drill
- Célula/fatia sem `drills_menu` correspondente fica **visualmente igual** à hoje (sem cursor pointer, sem hover) — o banner de admin acusa a lacuna, mas o usuário final não vê botão morto.
- Erro 422/500 do endpoint `/drill` mostra toast com o `detail` do backend.

## Detalhes técnicos

Arquivos afetados:
- `src/pages/rh/ResumoFolhaPage.tsx` — refatorar `openDrill` para aceitar `extras`, cabear cliques em tabelas/donut/gráfico, adicionar banner de diagnóstico admin.
- `src/components/rh/ResumoFolhaDrillDrawer.tsx` — aceitar `extras` (cd_filial, cd_evento, cd_tp_evento, anomes override) e repassar em `fetchResumoFolhaDrill`.
- `src/lib/rh/api.ts` — estender `ResumoFolhaDrillParams` com `cd_evento`, `cd_tp_evento`, aceitar override de período.
- `src/lib/rh/types.ts` — adicionar campos opcionais correspondentes.
- `docs/backend-etl-bi.md` — seção "RH · Resumo da Folha · Contrato drills_menu".

Zero mudança de backend nesta entrega. Se a investigação (item 1) confirmar que o FastAPI parou de devolver `drills_menu`, abrimos ticket separado após ver o log.

## Validação

1. Console mostra `drills_menu` recebido; se vazio, banner admin aparece com botão de copiar diagnóstico.
2. Clicar em cada KPI, célula de tabela, barra do gráfico e fatia do donut abre o `ResumoFolhaDrillDrawer` com os filtros corretos (verificar via Network o payload de `/api/rh/resumo-folha/drill`).
3. Itens sem drill correspondente permanecem sem hover/pointer e não emitem erro.
