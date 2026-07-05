## Objetivo

Refletir a nova evolução da API de RH > Quadro de Colaboradores no front. O Lovable passa a apenas consumir o payload — sem classificar Empresa, sem calcular Masculino/Feminino/Maternidade e sem montar histórico a partir do dashboard.

## Escopo

Somente 2 arquivos:

- `src/lib/rh/quadroDashboardApi.ts` (mapeamento/normalização)
- `src/pages/rh/QuadroColaboradoresPage.tsx` (renderização Empresa + observação Montagem Externa)

Nada de backend, nada de tabelas novas no Cloud, nada de regra de headcount no front.

## Mudanças por item

### 1. Masculino / Feminino
Fluxo de resolução (já parcialmente existente, será revisado e mantido):
1. `kpis.masculino` / `kpis.feminino` diretos (aceitando aliases `sexo_masculino`, `qtd_masculino`, etc.).
2. Fallback: distribuição em `distribuicoes.sexo`, `quebras.sexo`, `sexo`, `por_sexo` — array `[{sexo|label, valor|quantidade}]` ou objeto `{M: 360, F: 67}`.
3. Se a distribuição existir mas não tiver M/F → 0 (não pendente).
4. Só marca `null` (→ "Campo pendente na API") se nem KPI direto nem distribuição existirem.

### 2. Licença maternidade
1. `kpis.licenca_maternidade` / `kpis.lic_maternidade` / `kpis.maternidade`.
2. Fallback: `distribuicoes.situacao`, `distribuicoes.afastamento`, `situacao`, `situacoes`, `afastamento`, `afastamentos`, `quebras.situacao`, `por_situacao`.
3. Match por label contendo `MATERNIDADE` / `LIC MATERNIDADE` / `LIC.MATERNIDADE` (normalizado sem acento) ou por código Senior `cd_situacao/codigo == 6`.
4. Distribuição existe sem maternidade → 0. Nenhuma info de situação → pendente.

### 3. Empresa (mudança principal)
Regra nova:
- Consumir `distribuicoes.empresa`, `por_empresa`, `empresa`, `empresas` (nessa ordem).
- Aceitar array `[{empresa, quantidade}]` ou objeto `{GENIUS: 52, ESTRUTURAL: 375}`.
- **Nunca** derivar GENIUS / ESTRUTURAL / MONTAGEM EXTERNA no front.
- Se vier payload de empresa, renderizar o `BarChartCard` "Empresa" com o que vier (ordem: valor desc).
- Observação discreta abaixo do card "Empresa":
  - Se **não** houver uma entrada cuja label normalizada contenha `MONTAGEM EXTERNA`, exibir texto muted pequeno: `"Montagem Externa pendente de regra na API."`
  - Se as 3 categorias vierem (ESTRUTURAL, GENIUS, MONTAGEM EXTERNA), não mostrar observação.
- Se a API não retornar bloco de empresa, manter o card atual com aviso: `"Classificação Empresa pendente de regra na API"`.

Remover a lógica antiga que sempre forçava aviso quando `empresa` chegava vazio se agora a API responde parcialmente — só exibe pendência quando o bloco realmente não veio.

### 4. Histórico Nº Colaboradores
`fetchQuadroHistorico` já está flexível:
- Aceita array direto ou `{historico|dados|items|data: [...]}`.
- Competência via `anomes`, `anomes_competencia`, `competencia`, `mes`, `ano_mes` (mantém apenas dígitos).
- Valor via `colaboradores`, `total_colaboradores`, `qtd_colaboradores`, `quantidade`, `valor`, `total`.
- Ordena ascendente.

Revisão: garantir que o gráfico use **exclusivamente** `/api/rh/quadro-colaboradores/historico` (já é o caso — nenhum fallback via dashboard será introduzido). Card sempre renderiza; se vazio, mensagem "Sem dados no período selecionado.".

### 5. Regra de pendência
Padrão único, aplicado no `normalizeDashboard`:
- KPI direto ausente **e** distribuição correspondente ausente → `null` (UI mostra "Campo pendente na API").
- Distribuição presente sem a categoria → `0`.
- Nunca converter `null` real em `0`.

## Detalhes técnicos

Arquivo `src/lib/rh/quadroDashboardApi.ts`:
- Reforçar `pickFirst` para também olhar em `resumo`, além de `distribuicoes|quebras|dados` (defensivo caso a API novo formato use outro wrapper).
- `toBreakdown`: adicionar `r.empresa`, `r.grupo`, `r.classificacao` como label válida e `r.quantidade` como valor (já parcialmente coberto).
- Manter `normalizeSexoBreakdown` que renomeia M/F para "Masculino"/"Feminino" (usado pelo donut).
- Sem alterações no contrato exportado (`QuadroDashboard`, `QuadroKpis`, `QuadroBreakdown`, `QuadroHistoricoItem`).

Arquivo `src/pages/rh/QuadroColaboradoresPage.tsx`:
- Bloco Empresa passa a:
  - Renderizar `BarChartCard` sempre que `dashQ.data?.empresa?.length > 0`.
  - Abaixo do card, `<p className="text-xs text-muted-foreground mt-1">Montagem Externa pendente de regra na API.</p>` quando faltar essa categoria no payload.
  - Cair para o card de aviso atual apenas se `empresa` for nulo/vazio.
- Nenhuma outra alteração de layout/KPIs.

## Fora de escopo

- Backend / FastAPI.
- Cálculo de headcount, ativo/demitido, ponto-no-tempo.
- Novas telas ou tabelas no Cloud.
- Exportação Excel (mantém comportamento atual + `ExportQuadroIndisponivelError`).

## Validação (data_ref = 2026-04-30)

- Total = 427, Masculino = 360, Feminino = 67, Jovem Aprendiz = 24, Estagiários = 3, PCD = 11.
- Empresa: GENIUS = 52 exibido; se API ainda não separar Montagem Externa, aparecer aviso discreto abaixo do card.
- Histórico renderiza gráfico do endpoint `/historico`.
