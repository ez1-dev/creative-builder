## Ajuste — Consulta de Produtos: pré-carregar filtros via endpoint único

Trocar as duas chamadas de abertura (`/origens` + `/familias`) por uma única ao novo endpoint `/api/cadastros/produtos/filtros?somente_ativos=true`, mantendo o recarregamento de famílias por origem.

### Mudanças

**`src/lib/api.ts`**

1. Adicionar função `getProdutosFiltrosIniciais(somenteAtivos = true)` que chama:
   ```
   GET /api/cadastros/produtos/filtros?somente_ativos=true
   ```
   Retorna `{ origens: ProdutoCadastroComboItem[], familias: ProdutoCadastroComboItem[] }`.
2. Tipar a resposta aceitando os campos do backend (`codigo_origem/descricao_origem/quantidade_produtos/value/label` e equivalentes de família). Normalizar para o tipo `ProdutoCadastroComboItem` já usado (`{ codigo, descricao }`), preservando `value`/`label` quando vierem prontos.
3. Ajustar `getProdutosFamilias(codori?)` para enviar também `somente_ativos=true` por padrão, conforme o novo contrato:
   - `GET /api/cadastros/produtos/familias?somente_ativos=true`
   - `GET /api/cadastros/produtos/familias?codori=<x>&somente_ativos=true`
4. Manter `getProdutosCadastro` e remover apenas o uso de `getProdutosOrigens` da página (a função pode permanecer no `api.ts` para não quebrar nada).

**`src/pages/cadastros/ConsultaProdutosPage.tsx`**

1. Substituir os dois `useEffect` de origens/famílias por **um único** `useEffect` (na montagem, dependendo de `erpReady`) que chama `getProdutosFiltrosIniciais(true)` e preenche `origens` + `familias`.
2. Estados separados conforme spec:
   - `loadingFiltros` / `erroFiltros` (substitui `loadingOrigens` + `loadingFamilias` na abertura).
   - `loadingProdutos` / `erroProdutos` (renomear os atuais `loading` / `error`).
3. Manter um segundo `useEffect` que dispara **apenas quando `form.codori` muda após a carga inicial**, chamando `getProdutosFamilias(codori || undefined)`. Usar uma flag (`filtrosCarregados`) para não disparar antes do carregamento inicial.
4. Placeholders dos combos:
   - Origem: `"Carregando origens e famílias..."` enquanto `loadingFiltros`, depois `"Todas..."`.
   - Família: `"Carregando origens e famílias..."` enquanto `loadingFiltros`, `"Carregando famílias..."` enquanto recarrega por origem, senão `"Todas..."`.
5. Mensagens de erro/empty conforme spec:
   - Erro filtros (banner discreto acima do FilterPanel): `"Não foi possível carregar origens e famílias."`
   - Erro produtos: mensagem retornada pela API (já existe).
   - Empty produtos: `"Nenhum produto encontrado para os filtros informados."` (já existe).
   - Loading produtos: `"Consultando produtos..."` no `DataTable` (passar via prop ou overlay; manter o spinner atual do DataTable).
6. Estado inicial do form permanece: `codori=""`, `codfam=""`, `codpro=""`, `despro=""`, `tippro=""`, `somente_ativos=true`, `incluir_derivacoes=false`, `pagina=1`, `tamanho_pagina=100`.
7. Consulta de produtos continua disparando apenas no botão **Consultar** do `FilterPanel`.
8. Grid mantém colunas atuais (já cobrem todos os campos solicitados, incluindo as 3 extras de derivação quando `incluir_derivacoes=true`).

**`docs/backend-cadastros-produtos.md`**

- Adicionar seção descrevendo o novo endpoint `GET /api/cadastros/produtos/filtros?somente_ativos=true` com o JSON de exemplo da spec.
- Anotar que `/familias` agora aceita `somente_ativos`.
- Marcar `/origens` como ainda suportado, mas não usado pela tela na abertura.

### Fora de escopo

- Componente `ComboboxFilter`, `FilterPanel`, `DataTable`, paginação, export Excel.
- Implementação do endpoint no backend FastAPI (apenas atualizar a documentação do contrato).
