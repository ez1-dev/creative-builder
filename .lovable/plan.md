

# Adicionar filtro de Situação Cadastral (Ativo/Inativo) nas páginas de produto

## O que muda
Um novo filtro **"Situação"** será adicionado em todas as páginas que consultam cadastro de produto, permitindo filtrar entre produtos **Ativos**, **Inativos** ou **Todos**. Por padrão, o filtro virá como **"Ativo"**, mostrando apenas produtos ativos.

## Páginas afetadas

1. **Estoque** (`EstoquePage.tsx`)
2. **Compras / Custos do Produto** (`ComprasProdutoPage.tsx`)
3. **Auditoria Tributária** (`AuditoriaTributariaPage.tsx`)
4. **Estrutura BOM** (`BomPage.tsx`)
5. **Onde Usa** (`OndeUsaPage.tsx`)

## Alterações em cada página

Para cada uma das 5 páginas:

1. Adicionar `situacao: 'A'` ao estado inicial de filtros (`A` = Ativo, `I` = Inativo, `''` = Todos)
2. Adicionar um `<Select>` com as opções: **Todos**, **Ativo**, **Inativo**
3. Enviar o parâmetro `situacao` na chamada da API (ex: `situacao_cadastro=A`)
4. Incluir `situacao` no `clearFilters`, resetando para `'A'` (padrão Ativo)

## Detalhes técnicos

- O componente `Select` do shadcn/ui já existe no projeto
- O parâmetro enviado à API ERP será `situacao_cadastro` com valores `A`, `I` ou vazio (todos)
- O filtro usará o mesmo layout compacto dos filtros existentes (`h-8 text-xs`)

