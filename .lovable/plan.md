# Liberar Unidade de Negócio no diálogo "Aplicar componente"

## Problema
No `/biblioteca-bi`, ao clicar em **Aplicar em página…** num componente, o seletor de **Unidade de Negócio** só aparece quando a página alvo está marcada com `supportsUnidadeNegocio` (hoje: apenas `bi-comercial` e `faturamento-genius`). Para todas as outras páginas o usuário não consegue escolher unidade e o widget herda silenciosamente o filtro da página.

## Objetivo
Permitir que o usuário escolha a unidade ao aplicar qualquer componente, sem alterar comportamento padrão dos widgets já salvos.

## Mudanças

### 1. `src/components/bi/runtime/ApplyComponentDialog.tsx`
- Remover a condição `page?.supportsUnidadeNegocio &&` que esconde o bloco do seletor — sempre renderizar o grupo "Unidade de Negócio".
- Adicionar uma 4ª opção no array `UNIDADES`: `{ value: '__page__', label: 'Padrão da página', sub: 'Usa o filtro atual da página alvo', Icon: LayoutGrid }`.
- Estado inicial:
  - Se a página alvo tem `supportsUnidadeNegocio` e há `liveCtx.filtros.unidade_negocio`, manter o pré-selecionado atual.
  - Caso contrário, default = `__page__`.
- Ao salvar (`save`):
  - Se `unidadeNegocio !== '__page__'`, gravar `options.unidade_negocio = unidadeNegocio`.
  - Se `__page__`, não gravar a chave (igual ao comportamento atual).
- Tooltip/legenda muda para: "Sobrepõe o filtro de unidade da página alvo apenas para este widget. Escolha 'Padrão da página' para herdar o filtro corrente."

### 2. `src/components/bi/runtime/UserWidgetsSlot.tsx`
- Remover também o gate `ctx.page?.supportsUnidadeNegocio` no cálculo de `unidadeOverride` — se o widget tiver `options.unidade_negocio` definido, aplicar override em qualquer página. Isso garante que o valor escolhido no diálogo passe para o runtime mesmo em páginas genéricas.

### 3. (Opcional, mas recomendado) `src/lib/bi/pageRegistry.ts`
- Sem mudanças. O flag `supportsUnidadeNegocio` continua válido para outras telas (ex.: legendas de filtros), só o diálogo deixa de usá-lo como gate.

## Não-mudanças
- `AddBiWidgetDialog` (Adicionar bloco dentro do BI Comercial) — fora do escopo deste pedido.
- Geração de gráfico IA — fora do escopo.
- Edge functions e backend — nenhuma alteração.
- Estrutura da tabela `user_widgets` — já aceita `options.unidade_negocio`.

## Critério de aceite
- Em `/biblioteca-bi`, abrir "Aplicar em página…" em qualquer componente: o bloco "Unidade de Negócio" aparece sempre, com 4 opções (Padrão da página, GENIUS, ESTRUTURAL ZORTEA, CONSOLIDADO).
- Default = "Padrão da página" para páginas sem `supportsUnidadeNegocio`; para BI Comercial / Faturamento Genius o default segue o filtro atual da página.
- Widget salvo com unidade específica passa a usar essa unidade no runtime em qualquer página alvo.
- Widgets já existentes (sem `options.unidade_negocio`) continuam herdando o filtro da página — sem regressão.
