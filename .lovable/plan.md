# Mês por extenso nos filtros do BI Comercial

## Contexto
Os filtros AnoMês Início/Fim já foram convertidos em dois selects (Mês + Ano) no commit anterior, mas os meses estão abreviados (`Jan`, `Fev`, `Mar`…). O usuário quer ver os nomes por extenso (`Janeiro`, `Fevereiro`…).

A imagem em anexo ainda mostra os inputs antigos (`202601` / `202606`) — provavelmente o preview ainda não recarregou. Não é regressão; basta dar refresh para ver os selects que já estão no ar.

## Mudança

### `src/components/bi/comercial/AnomesSelect.tsx`
Trocar a constante `MESES` para nomes completos em PT-BR:

```ts
const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];
```

Como o nome agora é mais longo, ajustar o grid de `grid-cols-2 gap-1` para `grid-cols-[1fr_88px] gap-1` (mês mais largo, ano fixo) para evitar truncamento em telas estreitas.

## Fora do escopo
- Não mexer em `Comercial`, `Relatório Executivo` ou `Metas` — todos já consomem `AnomesSelect`, então a mudança propaga automaticamente.
- Sem alteração de contrato (segue enviando `AAAAMM`).

## Critério de aceite
- Filtros do BI Comercial mostram `Janeiro`, `Fevereiro`, …, `Dezembro` no dropdown de mês.
- Selecionar "Março" + "2026" envia `202603` ao backend.
