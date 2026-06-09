# Renomear rótulos dos filtros de período no BI Comercial

## Problema
Com os dois selects (Mês + Ano), o rótulo "AnoMês Início" / "AnoMês Fim" ficou redundante e confuso — o usuário já vê Mês e Ano logo abaixo.

## Mudança

### `src/pages/bi/ComercialPage.tsx` (filtros principais, ~linhas 1218–1232)
Trocar as labels passadas ao `AnomesSelect`:

- `label="AnoMês Início"` → `label="Período — De"`
- `label="AnoMês Fim"`    → `label="Período — Até"`

## Fora do escopo
- Outras telas (`RelatorioExecutivoFaturamentoPage` já usa `Início`/`Fim`, `MetasFaturamentoPage` usa `Anomês` em diálogo de cadastro single — ok).
- Sem mudança no componente `AnomesSelect`.

## Critério de aceite
- Filtro do BI Comercial mostra "Período — De" e "Período — Até" acima dos seletores de Mês/Ano.
