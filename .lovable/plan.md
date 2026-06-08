## Mapa do Brasil na Biblioteca BI

O componente `BrazilMapCard` já existe em `src/components/bi/charts/BrazilMapCard.tsx` (cartograma com as 27 UFs, intensidade por valor, click-to-drill), mas só é usado direto na página `/bi/comercial`. Ele não está registrado no `componentRegistry`, então não aparece em `/biblioteca-bi` nem pode ser aplicado como widget pelo usuário.

### O que fazer

Adicionar uma entrada nova no `src/lib/bi/componentRegistry.tsx`:

- `id: 'brazil-map'`
- `kind: 'chart'`
- `label: 'Mapa do Brasil'`
- `defaultSpan: 2`
- `inputs`: uma série (`series`, obrigatória) — espera itens cuja `label` (ou campo `uf`) seja a sigla da UF.
- `autoMap`: pega a primeira série disponível, preferindo as cujo `key` contenha `estado` ou `uf`.
- `render`: usa `SERIES_LIKE`, mapeia cada ponto para `{ uf: <sigla 2 letras extraída de p.uf|p.label>, valor: p.valor, label: p.label }`, e renderiza `<BrazilMapCard data={...} valueFormatter={formatterForSeriesKey(mapping.series)} onItemClick={makeClickHandler(ctx, mapping.series)} />`.
- Importar `BrazilMapCard` no bloco de imports `from '@/components/bi'` (já está exportado pelo barrel).

Extração da UF: se `p.uf` existir usa direto; senão tenta os 2 primeiros caracteres alfabéticos de `p.label` (ex.: "SP - São Paulo" → "SP"). Itens sem UF reconhecida ficam fora do mapa (cinza).

### Fora de escopo

- Não mexer em `BrazilMapCard.tsx` em si.
- Não mexer no `visualCatalog` (controle de permissões por gráfico) — pode ser feito depois se o usuário quiser uma chave dedicada para esse mapa.
- Não criar mapa por município/região (só UF, igual ao componente atual).
