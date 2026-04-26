# Catálogo de Colaboradores com autocomplete

## 1. Banco de dados (migration)

Criar tabela `colaboradores_catalogo`:
- `id uuid PK`
- `nome text NOT NULL UNIQUE`
- `ativo boolean DEFAULT true`
- `created_at timestamptz DEFAULT now()`

RLS:
- SELECT: qualquer usuário autenticado
- INSERT/UPDATE/DELETE: apenas admins (`is_admin(auth.uid())`)

Índice único `lower(nome)` para evitar duplicatas com diferenças de caixa.

## 2. Importar 152 nomes do CSV

Após criada a tabela, normalizar (TRIM + remover linhas vazias) e inserir os nomes do arquivo `data-2.csv` via `INSERT ... ON CONFLICT DO NOTHING`. O CSV tem alguns nomes praticamente duplicados que diferem só por acentuação (ex.: `EVILASIO BISPO DA PAIXAO FILHO` vs `EVILASIO BISPO DA PAIXÃO FILHO`); ambos serão mantidos como entradas distintas, pois não dá para saber qual é a forma correta — uma limpeza manual posterior pode mesclá-los.

## 3. Frontend — autocomplete no formulário

Em `src/pages/PassagensAereasPage.tsx`, substituir o `<Input>` simples do campo "Colaborador *" por um Combobox (mesmo padrão do `ComboboxFilter` já usado em outras telas, mem://features/filtros-hibridos-combobox):
- Carrega lista de `colaboradores_catalogo` (cached com React Query)
- Permite **selecionar da lista** OU **digitar livremente** (caso o nome ainda não esteja cadastrado)
- Busca com filtro por substring case-insensitive
- Se digitar nome novo + clicar em "+ Adicionar", insere na tabela e mantém selecionado

## 4. Frontend — filtro do dashboard

Em `PassagensDashboard.tsx`, o input de filtro "Colaborador" também passa a ser combobox lendo do catálogo (busca + sugestões).

## 5. KPI "Colaboradores"

Mantém a métrica atual (colaboradores únicos *com gastos registrados*), que continua refletindo o uso real do módulo. Conforme novos lançamentos forem feitos com nomes do catálogo, o KPI subirá naturalmente.

## Resumo do que muda
- Tabela nova: `colaboradores_catalogo` com 152 registros
- Formulário de cadastro: campo Colaborador vira combobox com autocomplete
- Filtro do dashboard: também vira combobox
- Lançamentos antigos ("Consolidado BI") permanecem intactos
