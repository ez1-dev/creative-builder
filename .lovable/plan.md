# Plano: Consulta de Produtos

Novo módulo de consulta de produtos do ERP Senior, com filtros por Origem/Família e suporte a derivações.

## 1. Sidebar (`src/components/AppSidebar.tsx`)

Criar nova seção colapsável **"Cadastros"** (ícone `Package` ou `Boxes` do lucide), seguindo o padrão dos grupos "Produção"/"Regras Senior". Primeiro item:

- `Consulta de Produtos` → `/cadastros/produtos` (ícone `Search` ou `PackageSearch`)

Aplicar a mesma lógica de visibilidade via `useUserPermissions().canView`.

## 2. Roteamento (`src/App.tsx`)

Adicionar rota protegida:

```
/cadastros/produtos  →  <ConsultaProdutosPage />
```

Envolver com `<ProtectedRoute>` e `<AppLayout>` no mesmo padrão das outras páginas.

## 3. Camada de API (`src/lib/api.ts`)

Adicionar tipos e funções (o helper `api.get` já injeta `Authorization: Bearer`):

```ts
export interface ProdutoCadastroFilters {
  codemp?: number;
  codori?: string;
  codfam?: string;
  codpro?: string;
  despro?: string;
  tippro?: string;
  somente_ativos?: boolean;
  incluir_derivacoes?: boolean;
  pagina?: number;
  tamanho_pagina?: number;
}

export interface ProdutoCadastroItem {
  codigo_produto: string;
  descricao_produto: string;
  codigo_origem: string;
  descricao_origem: string;
  codigo_familia: string;
  descricao_familia: string;
  unidade_medida: string;
  tipo_produto: string;
  situacao: string;
  qtd_derivacoes_ativas: number;
  codigo_derivacao?: string;
  descricao_derivacao?: string;
  situacao_derivacao?: string;
}

export interface ProdutoCadastroResponse {
  pagina: number;
  tamanho_pagina: number;
  total_registros: number;
  total_paginas: number;
  filtros: Record<string, unknown>;
  dados: ProdutoCadastroItem[];
}

getProdutosCadastro(f: ProdutoCadastroFilters): Promise<ProdutoCadastroResponse>
getProdutosOrigens(): Promise<{codigo:string; descricao:string}[]>
getProdutosFamilias(codori?: string): Promise<{codigo:string; descricao:string}[]>
```

Endpoints: `/api/cadastros/produtos`, `/api/cadastros/produtos/origens`, `/api/cadastros/produtos/familias`.

## 4. Página (`src/pages/cadastros/ConsultaProdutosPage.tsx`)

Componente `ConsultaProdutos` com layout padrão das outras telas ERP (`FilterPanel` + `DataTable` + `PaginationControl` do `src/components/erp/`).

### Estado
- `form`: { codori, codfam, codpro, despro, tippro, somente_ativos=true, incluir_derivacoes=false }
- `pagina=1`, `tamanhoPagina=100`
- `origens[]`, `familias[]` (combos)
- `data`, `loading`, `error`

### Comportamento
- Ao montar: carrega `/origens`.
- Ao mudar `codori`: recarrega `/familias?codori=...` e limpa `codfam`. Se vazio, chama `/familias` sem filtro.
- Consulta **só** dispara ao clicar **Consultar** (não no onChange).
- Botão **Limpar filtros** restaura defaults e zera resultados.
- Paginação via `PaginationControl` (já suporta `pageSize` opcional).

### Filtros (UI)
- Combo Origem (Select com busca)
- Combo Família (Select com busca, depende da Origem)
- Input Código do Produto
- Input Descrição do Produto
- Input Tipo do Produto (ou Select se houver enum conhecido; por ora texto livre)
- Checkbox "Somente ativos" (default ON)
- Checkbox "Incluir derivações" (default OFF)
- Botões Consultar / Limpar

### Grid
Colunas base:
- Código Produto, Descrição Produto, Origem, Descrição Origem, Família, Descrição Família, Unidade Medida, Tipo Produto, Situação (badge), Qtd Derivações Ativas (numérico)

Quando `incluir_derivacoes=true`, adicionar dinamicamente: Código Derivação, Descrição Derivação, Situação Derivação.

### Estados visuais
- Loading: skeleton + texto "Carregando produtos..."
- Vazio: "Nenhum produto encontrado para os filtros informados."
- Erro: alerta com mensagem da API (usar `ErpConnectionAlert` se for falha de conexão).

## 5. Permissões

Adicionar entrada `/cadastros/produtos` ao catálogo de telas (`src/lib/screenCatalog.ts`) para que apareça em `PermissoesPorTelaPanel` e seja respeitada pelo `useUserPermissions`.

## 6. Documentação

Criar `docs/backend-cadastros-produtos.md` com o contrato dos 3 endpoints, parâmetros, exemplos e shape da resposta — base para o time de backend FastAPI validar/implementar.

## Fora de escopo
- Edição/cadastro de produtos (somente consulta).
- Exportação Excel (pode ser adicionada depois se solicitado).
- Drill-down em derivações além das colunas extras.
