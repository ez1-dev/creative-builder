## Objetivo
Zerar os 2 avisos "No label associated with a form field" originados nos filtros AnoMês Inicial/Final, sem alterar API ou regra de negócio.

## Causa
Três locais renderizam `<Label>` + `<Input>` para AnoMês sem `htmlFor`/`id` estáveis, então o React usa ids gerados (`:r21:`) e o Label fica solto:

1. `src/pages/bi/ComercialPage.tsx` (linhas 572–583) — AnoMês Início / AnoMês Fim.
2. `src/pages/bi/FaturamentoValidacaoPage.tsx` (helper `filtroField`, linhas 325–340) — usado por `anomes_ini`, `anomes_fim` e demais filtros texto.
3. `src/components/faturamento/AuditoriaRevendaTab.tsx` (linhas 420–438) — Ano/Mês inicial e final.

## Mudanças (somente apresentação)

1. **ComercialPage.tsx** — adicionar `id="anomes_ini"` / `name="anomes_ini"` no `<Input>` e `htmlFor="anomes_ini"` no `<Label>`; idem para `anomes_fim`.

2. **FaturamentoValidacaoPage.tsx** — alterar o helper `filtroField` para derivar um id estável a partir de `key` (ex.: `id={`flt-${String(key)}`}`), aplicar `htmlFor` no Label e `id`/`name` no Input. Isso cobre `anomes_ini`, `anomes_fim` e os demais campos texto da mesma tela sem precisar mexer em cada chamada.

3. **AuditoriaRevendaTab.tsx** — adicionar `id`/`name="anomes_ini"` e `htmlFor` correspondente; idem para `anomes_fim`. (Aplicar também aos outros Inputs do mesmo bloco — Projeto, etc. — para evitar warnings residuais já que estão no mesmo formulário.)

## Padrão adotado
- Ids estáveis em snake_case (`anomes_ini`, `anomes_fim`), nunca ids gerados como `name`.
- Label sempre com `htmlFor` igual ao `id` do Input.
- Nenhum componente compartilhado (`FilterPanel`, `FilterBar`, `SelectFilter`, `MultiSelectFilter`) muda de assinatura — apenas o helper local `filtroField` ganha id derivado da própria key.

## Fora de escopo
- Nenhuma alteração em endpoints, filtros, queries, lógica de negócio.
- Outras telas (Carga, Programação, OndeUsa, etc.) já usam `useId`/`htmlFor` corretos e não disparam o aviso atual.
