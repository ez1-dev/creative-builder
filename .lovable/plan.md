# Plano de correção do drill do BI Comercial

## Objetivo
Padronizar a limpeza de filtros técnicos e o diagnóstico do drill para impedir filtros ocultos/inválidos no payload e deixar explícito qual filtro zerou a base.

## O que vou implementar

### 1. Sanitização global do contexto de drill
- Reforçar a função global `cleanDrillValue(value)` para transformar em `null` qualquer valor inválido:
  - `undefined`
  - `null`
  - `"undefined"`
  - `"null"`
  - vazio
  - `"(sem nome)"`
  - `"sem nome"`
  - `"TODOS"` / `"Todos"` / `"todas"`
  - `"CONSOLIDADO"`
- Garantir que `cleanDrillContext(contexto)` normalize todas as chaves técnicas do drill.
- Garantir que o payload final enviado ao backend sempre use apenas contexto já limpo.

### 2. Prioridade correta na montagem do payload
- Padronizar a composição do contexto para seguir esta ordem:
  1. filtros globais do dashboard como base
  2. contexto atual do stack
  3. `row.filtros_drill` por último, vencendo os anteriores
- Impedir fallback para `row.label` quando `row.filtros_drill` existir.
- Impedir qualquer uso de `"(sem nome)"` como filtro técnico.
- Aplicar essa mesma regra tanto na abertura inicial do drawer quanto no avanço entre níveis do drill.

### 3. Limpeza de filtros residuais no stack
- Ajustar a abertura de drill por KPI/card para começar somente com filtros globais válidos, sem reaproveitar filtros técnicos residuais de outro drill.
- Garantir que mudanças de nível e “Trocar drill” preservem apenas chaves compatíveis com o nível alvo e já sanitizadas.
- Garantir que remover filtros pelo diagnóstico/chips também mantenha o contexto consistente.

### 4. Diagnóstico visual completo
- Expandir o diagnóstico para mostrar todos os filtros técnicos que podem zerar a consulta, incluindo:
  - `cd_nf`
  - `cd_tns`
  - `cd_origem`
  - `cd_tp_movimento`
  - `cd_prj`
  - `cd_derivacao`
  - `categoria_custom`
- Exibir todos os filtros aplicados com base no contexto efetivamente enviado.
- Exibir `filtro_que_zerou` de forma destacada quando vier na resposta.
- Quando `rows = []` e `qtd_linhas_apos_unidade > 0`, mostrar também:
  - filtros aplicados completos
  - filtro que zerou
  - payload enviado

### 5. Tipagem e contrato do drill
- Atualizar os tipos do diagnóstico para cobrir todos os campos adicionais usados na tela.
- Incluir no contrato do drill o payload sanitizado exibido no diagnóstico, sem mudar o backend.
- Manter compatibilidade com GENIUS, ESTRUTURAL ZORTEA e CONSOLIDADO na interface, mas sem enviar `CONSOLIDADO` como filtro técnico dentro do `contexto`.

## Arquivos a ajustar
- `src/lib/bi/comercialDrillContract.ts`
- `src/lib/bi/comercialDrillApi.ts`
- `src/lib/bi/comercialDrillCatalog.ts`
- `src/hooks/useComercialDrillStack.ts`
- `src/components/bi/drill/ComercialDrillDrawer.tsx`
- `src/components/bi/drill/DrillEmptyDiagnostico.tsx`
- `src/pages/bi/ComercialPage.tsx`

## Detalhes técnicos
- Centralizar a limpeza em `cleanDrillValue` / `cleanDrillContext` / `compactDrillContext`.
- Passar o contexto sanitizado até a requisição, em vez de limpar parcialmente em pontos isolados.
- Usar o contexto final efetivamente enviado para compor a área de diagnóstico, evitando divergência entre tela e payload.
- Adicionar no diagnóstico a visualização do payload do request para identificar rapidamente o filtro oculto que zerou a base.

## Resultado esperado
- Nenhum payload enviará `"undefined"`, `"null"`, `"(sem nome)"`, `"TODOS"` ou `"CONSOLIDADO"` como filtro técnico.
- O drill voltará a trazer dados quando houver base válida para GENIUS/período e o problema for filtro residual/inválido.
- O diagnóstico mostrará exatamente qual filtro zerou a base e com qual payload isso ocorreu.