## Objetivo

Nos filtros de **Contas a Pagar** e **Contas a Receber**, substituir os campos de texto livre por componentes com lista suspensa (autocomplete assíncrono) para:

- **Fornecedor** (Pagar) / **Cliente/Fornecedor** (Receber)
- **Centro de Custo**
- **Projeto**

Assim o usuário passa a ver as opções já disponíveis no ERP conforme digita, sem precisar decorar código/nome.

## Componentes e endpoints já disponíveis

Reutilizar o padrão já usado em Painel de Compras:

- `AutocompleteAsync` (`src/components/erp/AutocompleteAsync.tsx`) — combobox com busca assíncrona + cache.
- Hooks em `src/hooks/useCadastrosErp.ts`:
  - `fetchFornecedoresCadastro` → `GET /api/cadastros/fornecedores?q=`
  - `fetchCentrosCusto` → `GET /api/cadastros/centros-custo?q=`

Para **Projeto** ainda não existe `/api/cadastros/projetos`. Adicionar um novo fetcher `fetchProjetos` em `useCadastrosErp.ts` apontando para `/api/cadastros/projetos?q=` (mesmo contrato dos demais: `codigo`, `descricao`, `label`). Documentar o endpoint faltante em `docs/backend-cadastros-autocomplete.md` (seção 5) — o `AutocompleteAsync` já degrada silenciosamente para "Nenhum resultado" enquanto o backend não sobe.

## Alterações no frontend

### `src/pages/ContasPagarPage.tsx` e `src/pages/ContasReceberPage.tsx`

- Substituir os três `<Input>` dos filtros **Fornecedor**, **Centro de Custo** e **Projeto** por `AutocompleteAsync` correspondentes.
- Manter os mesmos nomes de parâmetros já enviados ao backend (`fornecedor`, `centro_custo`, `projeto` / `numero_projeto`) — o valor passado ao filtro continua sendo o `codigo` selecionado.
- Preservar o comportamento atual dos demais filtros e do checkbox "Incluir títulos pagos/liquidados", "Base do filtro de valor", agrupamentos e árvore.
- Botão "X" do `AutocompleteAsync` limpa o filtro (equivalente ao campo vazio de hoje).

Nada muda em serviços, exports, contratos ou lógica de negócio — apenas a apresentação dos três filtros.

## Fora de escopo

- Não alterar colunas da grid nem endpoints de lista/árvore/dashboard/export.
- Não mexer nos demais filtros (datas, situação, moeda, valor, portador, natureza).
- Não criar cache global novo — o já existente em `useCadastrosErp.ts` é suficiente.
