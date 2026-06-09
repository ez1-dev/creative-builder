# Ajustar layout dos rótulos do AnomesSelect

## Problema
Hoje o `AnomesSelect` mostra apenas um rótulo único acima dos dois selects (Mês e Ano), e a string "AnoMês" sai grudada. O usuário quer:
1. Cada select com seu próprio rótulo logo acima ("Mês" acima do select de mês, "Ano" acima do select de ano).
2. Um título de grupo legível ("Período inicial" / "Período final") em cima de tudo.

## Mudança

### `src/components/bi/comercial/AnomesSelect.tsx`
Reformatar o render:

```
[ Label de grupo: "Período inicial" ]
[ Mês ]   [ Ano ]
[Janeiro▼] [2026▼]
```

- Manter `Label` principal (opcional, vindo da prop `label`) acima de tudo, em `text-xs font-medium text-muted-foreground`.
- Acima de cada `Select`, adicionar um pequeno `Label` ("Mês" e "Ano") em `text-[10px] uppercase tracking-wide text-muted-foreground`.
- Estrutura por coluna: `<div className="flex flex-col gap-1"><Label>Mês</Label><Select.../></div>`.
- Manter o grid `grid-cols-[1fr_88px] gap-2` para o par de selects.

### `src/pages/bi/ComercialPage.tsx`
Trocar as labels do grupo para evitar "AnoMês":
- `label="Período — De"` → `label="Período inicial"`
- `label="Período — Até"` → `label="Período final"`

### `src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx`
- `label="Início"` → `label="Período inicial"`
- `label="Fim"`    → `label="Período final"`

## Fora do escopo
- `MetasFaturamentoPage` (diálogo de cadastro single — já usa label "Anomês" do `<Label>` externo). Sem alteração.

## Critério de aceite
- Bloco de filtros mostra "Período inicial" no topo, e logo abaixo dois selects com mini-rótulos "Mês" e "Ano".
- Equivalente para "Período final".
- Sem a string "AnoMês" colada em lugar nenhum.
