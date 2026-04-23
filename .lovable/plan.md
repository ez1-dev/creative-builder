

## Corrigir erro 422 ao exportar Excel no Painel de Compras

### Diagnóstico
O endpoint `/api/export/painel-compras` retorna **422 (Unprocessable Entity)** quando o `ExportButton` envia os filtros do Painel de Compras como query params. 422 no FastAPI significa que algum parâmetro não passou na validação Pydantic do backend (tipo errado ou valor não aceito).

Causa provável (a confirmar inspecionando `PainelComprasPage.tsx` antes de aplicar o fix):
- O `ExportButton` serializa **todos** os filtros do estado via `String(value)`. Filtros boolean (ex.: `somente_em_aberto`, `incluir_servicos`) viram a string `"true"`/`"false"`, e o backend espera `bool` real ou os literais `1/0`.
- Filtros do tipo array (ex.: lista de status, múltiplos fornecedores) são serializados como `"a,b,c"` em vez de repetir a chave (`?status=a&status=b`), formato exigido pelo FastAPI para `List[str]`.
- Datas no formato `dd/MM/yyyy` quando o backend espera `yyyy-MM-dd` (ou vice-versa).
- Campos numéricos (ex.: `tamanho_pagina`, valores mínimos) chegando como string vazia `""` em vez de serem omitidos.

### Plano de correção

**1) Inspecionar o estado real**
- Abrir `src/pages/PainelComprasPage.tsx` e listar exatamente quais campos compõem `filters` (tipos: string, boolean, array, número, data).
- Cruzar com o contrato do backend (procurar em `docs/` se houver `.md` do painel-compras; senão, inferir pelos filtros que o `GET /api/painel-compras` aceita hoje sem 422).

**2) Tornar o `ExportButton` tolerante a tipos**
Editar `src/components/erp/ExportButton.tsx` para serializar `params` corretamente:
- `boolean` → enviar **só quando `true`**, como `"true"` (mesma convenção que o GET de listagem usa hoje); se for `false`, **omitir** a chave.
- `Array` → fazer `searchParams.append(key, item)` para cada item (gera `?k=a&k=b`).
- `string ""`, `null`, `undefined` → omitir.
- `number` / `Date` → manter `String(value)`.
- Datas que sejam `Date` → converter para ISO `yyyy-MM-dd` antes.

**3) Alinhar payload de export ao payload da listagem**
No Painel de Compras, em vez de passar `filters` cru para `<ExportButton params={filters} />`, passar o **mesmo objeto que é enviado para `api.get('/api/painel-compras', payload)`** (já normalizado pela página). Isso garante 1:1 entre busca e export.

**4) Validar**
- Reproduzir o cenário exato (mesmos filtros do print do usuário, viewport 1568×790, rota `/painel-compras`).
- Confirmar `200` + download do `.xlsx`.
- Testar 3 combinações: (a) sem filtros, (b) com booleano marcado, (c) com filtro de período preenchido.

### Arquivos alterados
- `src/components/erp/ExportButton.tsx` — serialização robusta de booleans, arrays, datas e vazios.
- `src/pages/PainelComprasPage.tsx` — passar o mesmo `payload` normalizado da consulta para o `ExportButton` (em vez de `filters` cru), se o diff entre eles for a causa.

### Fora de escopo
- Mudar o backend (não temos acesso; apenas adaptamos o frontend ao contrato).
- Alterar outros `ExportButton` de outras telas — o fix no componente é genérico e beneficia todas, sem precisar editar página por página.

### Resultado
Exportar Excel no Painel de Compras volta a funcionar com qualquer combinação de filtros, e o componente `ExportButton` passa a tratar corretamente boolean/array/data/vazio em todas as telas que o usam.

