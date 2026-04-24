

## Testes automatizados — contrato da Auditoria Genius

Garantir, via Vitest, que a Auditoria Apontamento Genius:
1. sempre envia `numorp` e `codori` na URL (mesmo vazios);
2. usa o builder do `ApiClient.get` com `keepEmpty: ['numorp','codori']`;
3. mantém **paridade exata** dos params entre listagem (`/api/apontamentos-producao`) e exportação (`/api/export/apontamentos-producao`).

### Arquivos novos

#### 1) `src/lib/__tests__/api.test.ts`
Testa o `ApiClient` isoladamente (mock global de `fetch`), travando o comportamento que sustenta o contrato Genius:

- `get()` **omite** chaves vazias por padrão.
- `get()` com `{ keepEmpty: ['numorp','codori'] }` **inclui** essas chaves vazias na query string (`numorp=&codori=`).
- `get()` mantém valores `0` (ex.: `somente_acima_8h: 0`) na URL — proteção contra falsy bug.
- Em resposta 422 com `detail` array (FastAPI), a mensagem do `Error` lançado é **string legível** (`numorp: Field required; codori: Field required`) e nunca contém `[object Object]`.

#### 2) `src/components/erp/__tests__/ExportButton.test.tsx`
- Mocka `fetch` retornando um Blob.
- Renderiza `<ExportButton endpoint="/api/export/apontamentos-producao" params={exportParams} keepEmptyKeys={['numorp','codori']} />` com `numorp` e `codori` vazios.
- Clica no botão e verifica que a URL chamada contém `numorp=` e `codori=` (preservados vazios) e os demais params com nomes corretos.

#### 3) `src/pages/__tests__/AuditoriaApontamentoGeniusPage.contract.test.tsx`
Teste de contrato leve (sem renderizar a página inteira). Em vez de montar a UI gigante, testa o **builder de params** extraindo a lógica:

- Importa um helper novo `buildAuditoriaParams(filters)` (ver passo 4).
- Verifica que para um `filters` com `numop=''` e `codori=''`:
  - chaves obrigatórias presentes: `numorp`, `codori` (string vazia).
  - chaves renomeadas corretamente: `numorp` (não `numero_op`), `codori` (não `origem`), `codpro` (não `codigo_produto`), `somente_acima_8h` (não `somente_maior_8h`).
- Verifica **igualdade de chaves e valores** entre `buildAuditoriaParams(filters)` e `buildAuditoriaExportParams(filters)` (exceto `pagina`/`tamanho_pagina` que só existem na listagem).

#### 4) Pequena refatoração em `src/pages/AuditoriaApontamentoGeniusPage.tsx`
Para tornar o contrato testável sem montar a página:

- Extrair os dois objetos literais existentes (`api.get(...)` payload e `exportParams`) para duas funções puras exportadas no topo do arquivo:
  - `export function buildAuditoriaListParams(filters, pagina, tamanho_pagina)`
  - `export function buildAuditoriaExportParams(filters)`
- Substituir os literais inline por chamadas a essas funções. Comportamento idêntico ao atual.
- Exportar também a constante `AUDITORIA_KEEP_EMPTY = ['numorp','codori'] as const` e usá-la nos dois pontos (busca + ExportButton).

### Como rodar
`npx vitest run` (já configurado em `vitest.config.ts`).

### Fora de escopo
- Não testar UI completa (sheets, drawers, tabelas).
- Não tocar no backend.
- Sem mudanças visuais.

### Resultado
Qualquer regressão futura que renomeie um param, esqueça `numorp`/`codori`, ou desincronize listagem × exportação **quebra os testes** antes de chegar ao usuário.

