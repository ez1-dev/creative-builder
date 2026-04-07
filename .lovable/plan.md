

# Combobox com lista e digitação para Família, Origem e Depósito

## O que será feito
Substituir os campos de texto simples dos filtros **Família**, **Origem** (e opcionalmente **Depósito**) por um componente **Combobox** — um campo que permite tanto digitar livremente quanto selecionar de uma lista suspensa com busca.

## Como funciona
1. Ao abrir a página de Estoque, o sistema busca as listas de famílias e origens disponíveis na API ERP (endpoints como `/api/familias` e `/api/origens`).
2. O usuário pode clicar no campo e ver a lista completa, ou começar a digitar para filtrar as opções.
3. Se o valor digitado não existir na lista, ele é aceito mesmo assim (digitação livre).

## Implementação

### 1. Criar componente `ComboboxFilter`
- Novo arquivo `src/components/erp/ComboboxFilter.tsx`
- Usa os componentes `Popover` + `Command` (já existem no projeto) para montar um combobox com busca
- Props: `value`, `onChange`, `options` (lista de `{value, label}`), `placeholder`, `loading`
- Permite digitação livre: se o texto não bater com nenhuma opção, o valor digitado é usado diretamente
- Estilo compacto (`h-8 text-xs`) para combinar com os outros filtros

### 2. Atualizar `EstoquePage.tsx`
- Ao montar a página (ou quando `erpReady` mudar), buscar listas:
  - `api.get('/api/familias')` → lista de famílias
  - `api.get('/api/origens')` → lista de origens
- Substituir os `<Input>` de Família e Origem pelo novo `<ComboboxFilter>`
- Manter os demais filtros (Código, Descrição, Depósito) como `<Input>` simples

### 3. Aplicar nas outras páginas
- **PainelComprasPage**, **EngenhariaProducaoPage** e demais páginas que têm filtros de Família/Origem receberão o mesmo tratamento, reutilizando o `ComboboxFilter`.

## Dependência da API
Se os endpoints `/api/familias` e `/api/origens` não existirem na API ERP, existem duas alternativas:
- Extrair os valores únicos dos dados já carregados na tabela (após a primeira pesquisa)
- Criar os endpoints na API ERP

## Resultado
O usuário verá um dropdown com busca nos campos Família e Origem, podendo selecionar da lista ou digitar livremente.

