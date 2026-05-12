# Identificadores — corrigir filtros

## Diagnóstico

Em `/regras-senior/identificadores`, dois sintomas:

1. **Lista corta resultados em 100** — o backend retorna paginado: `{ pagina:1, tamanho_pagina:100, total:169, total_paginas:2, dados:[…100] }`. O frontend só consome `dados` da primeira página, então com `situacao=A` (169 itens) o usuário enxerga só 100 e parece que filtros somem registros.
2. **Filtros locais (`texto`, `codreg`, e possivelmente `modsis`/`idereg`/`codemp` com match parcial) podem não ser respeitados pelo backend**, dependendo da implementação. Hoje o frontend confia 100% na API; se um param não for suportado, o filtro vira no-op.

A chamada com `situacao=I` retorna 42/42, então `situacao` está OK. Os demais parâmetros precisam de uma rede de segurança no cliente.

## Correções

### 1. `seniorApi.listarIdentificadores` — buscar todas as páginas

Em `src/lib/senior/api.ts`:

- Passar `tamanho_pagina=500` no primeiro request.
- Se a resposta vier como `{ total_paginas, pagina, dados }` e `total_paginas > 1`, fazer requests sequenciais para as páginas restantes e concatenar `dados`.
- Limite de segurança: no máximo 20 páginas (10 000 itens).
- Funcionar igualmente quando o backend retorna array puro (sem paginação) — comportamento atual via `unwrapList`.

Implementação: helper interno `getListAllPages(url, params)` específico para esta rota; `listarRegras` e demais ficam inalteradas.

### 2. `IdentificadoresList` — filtragem client-side como fallback

Em `src/components/regras-senior/IdentificadoresList.tsx`:

- Manter o envio dos filtros para a API (servidor reduz payload quando souber).
- Após receber `data`, aplicar `useMemo` que filtra novamente em memória usando os mesmos campos do formulário:
  - `codemp` → igualdade numérica.
  - `modsis` → `includes` case-insensitive.
  - `idereg` → `includes` case-insensitive.
  - `codtns` (já não tem campo, ignorar).
  - `codreg` → igualdade numérica.
  - `situacao` → igualdade.
  - `texto` → `includes` case-insensitive em `idereg + descricao + observacao + modsis + codreg`.
- Passar o array filtrado para a `DataTableBI`.
- Manter `Atualizar`/`Filtrar` recarregando do backend; o filtro client-side roda automaticamente quando qualquer input muda, sem precisar clicar em Filtrar (UX mais previsível).

### 3. Indicar total real

Acima da tabela, exibir um pequeno contador: `Mostrando X de Y registros` para deixar claro quando há filtro local ativo.

## Fora do escopo

- Paginação visual (manter "carregar tudo" com limite de 500–10 000).
- Alterações no backend; tudo é resolvido no frontend.
- Mudanças em `RegrasList`, autenticação ou rotas.

## Arquivos

```text
EDIT  src/lib/senior/api.ts                                  (paginação completa)
EDIT  src/components/regras-senior/IdentificadoresList.tsx   (filtro client-side + contador)
```
