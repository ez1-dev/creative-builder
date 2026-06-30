## Objetivo
Tela `01 — Resumo Folha` passa a renderizar exclusivamente o payload de `GET /api/rh/resumo-folha/dashboard`. Remover toda agregação client-side. Sincronizar RH recarrega o dashboard.

## Mudanças

### 1. `src/lib/rh/api.ts`
- `fetchResumoFolhaDashboard(p, modo?)`: incluir `codemp` (default `1`) nos params, manter envio de `anomes_ini`/`anomes_fim` em `YYYYMM` via `toAnomes()`. Remover `modo` do contrato chamado pela tela (a API nova não usa); manter assinatura opcional para retrocompat.
- **Remover/aposentar** `fetchResumoFolhaConsolidado`, `aggregateKpisFromLinhas`, `buildProventosFromLinhas`, `buildDescontosFromLinhas`, `buildTiposEventoFromLinhas`, `buildFiliaisFromLinhas`, `buildMensalFromLinhas` (toda lógica de classificação/soma no front).
- `normalizeDashboard`: adicionar campos novos por filial (`va`, `prov_ferias`, `prov_13`, `proventos`, `descontos`) preservando aliases simples (`beneficios↔va`); **não** inventar valores se ausentes — manter `undefined` para que a UI exiba aviso técnico.
- Detector de campo ausente: helper `missing(obj, key)` que devolve `true` quando a chave não existe no payload (diferente de `0`). Usado pela UI.

### 2. `src/lib/rh/types.ts`
- Estender `ResumoFolhaFilialAgg` com `va`, `prov_ferias`, `prov_13`, `proventos`, `descontos` (opcionais).

### 3. `src/pages/ResumoFolhaPage.tsx`
- Trocar `useQuery` para chamar somente `fetchResumoFolhaDashboard({anomes_ini, anomes_fim})` (passando `codemp=1`). Eliminar a segunda query "mensal" e qualquer uso de `fetchResumoFolha`/consolidado.
- Cards: ler diretamente `data.kpis.*`. Quando o campo não vier do backend, renderizar badge `"Campo não retornado pela API: <nome>"` em vez de `R$ 0,00`.
- Tabela Filial: colunas exatamente nesta ordem — filial, salario_base, custo_total, qtd_horas, custo_hora_extra, qtd_hora_extra, liquido, fgts, va, inss, custo_ferias, prov_ferias, prov_13, proventos, descontos.
- Tabelas Proventos+Vantagens, Descontos e Tipos de Evento: alimentadas pelos arrays correspondentes do payload (sem agregação local).
- Remover gráficos/tabelas mensais que dependiam de `mensal[]` (não previstos nesse endpoint) — ou mantê-los apenas se `data.mensal` existir; caso ausente, ocultar a seção.
- Remover o banner de "valores zerados" baseado em linhas.

### 4. `src/components/rh/SincronizarRhDialog.tsx`
- Após `sincronizarRh` com sucesso, invalidar a query do dashboard (`["rh","resumo-folha","dashboard", ...]`) para forçar refetch do novo endpoint. Já invalida `["rh"]`; garantir que a key do dashboard começa com `["rh", ...]`.

## Notas
- Bearer Token continua via `api.get` (já autenticado).
- Filtro de mês na UI continua `<input type="month">`; conversão para `YYYYMM` já existe (`toAnomes`).
- Não tocar em regras de classificação — toda lógica fica na API.
