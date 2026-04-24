

## Adicionar busca por fornecedor no Painel de Compras

### O que muda

**`src/pages/PainelComprasPage.tsx`**
- Substituir o `<Input>` atual do filtro "Fornecedor" pelo componente `ComboboxFilter` (já existe no projeto, com ícone de busca/lupa nativo via `ChevronsUpDown` + campo de busca interno).
- Popular as opções a partir dos fornecedores presentes em `data.dados` (campo do fornecedor retornado pela API), montando lista única ordenada.
- Manter compatibilidade: o usuário pode digitar livremente um termo (busca parcial) ou escolher um fornecedor da lista. O valor segue indo no mesmo parâmetro de filtro atual.

### Como fica
- Campo "Fornecedor" passa a ter dropdown com lupa/seta, busca incremental dentro da lista e opção "Usar '<texto>'" quando o usuário digita algo que não está nas sugestões (comportamento padrão do `ComboboxFilter`).
- Sem mudança de contrato com o backend — mesmo parâmetro, mesmo formato.

### Detalhe técnico
- Reaproveitar padrão já usado em `ComprasProdutoPage` (família/origem via `ComboboxFilter` + extração de únicos do `data.dados`).
- Antes de codar, vou conferir em `PainelComprasPage.tsx` o nome exato do campo do fornecedor no filtro e na resposta (ex.: `fornecedor`, `nome_fornecedor`, `cod_fornecedor`) para mapear value/label corretamente.
- Se houver endpoint dedicado tipo `/api/fornecedores`, uso ele como fonte primária e mesclo com os fornecedores da página atual (mesmo padrão do `useErpOptions`). Caso não exista, fica só com os derivados de `data.dados`.

### Validação
- Abrir `/painel-compras`, clicar no campo Fornecedor → dropdown abre com lista, lupa/seta visível, busca filtra a lista, seleção aplica o filtro e Pesquisar funciona normalmente.
- Digitar texto livre que não está na lista → opção "Usar '<texto>'" aparece e aplica como filtro de busca parcial.

