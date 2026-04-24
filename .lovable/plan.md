

## Ajustes na página Faturamento Genius

A página já está renderizando em `/faturamento-genius`. Este plano apenas alinha o que existe ao layout solicitado e corrige o warning do React no console.

### 1. Corrigir warning de ref no Select
Console mostra: *"Function components cannot be given refs"* apontando para `Select` dentro de `FaturamentoGeniusPage`. Causa: provavelmente um `<SelectTrigger>` está envolvido em um wrapper customizado sem `forwardRef` (ou um `Label`/`div` recebendo ref). Corrigir removendo qualquer `ref` indevido nos `Select` e garantindo que o `SelectTrigger` seja filho direto do `Select`.

### 2. Garantir presença de todos os filtros do escopo
Conferir e adicionar (se faltar) no `FilterPanel`:
- Ano/Mês inicial e final (Input YYYYMM)
- Revenda, Cliente, Representante, Produto, Pedido, NF (Input)
- Origem (Select: Todas, MÁQUINAS, PEÇAS, SERVIÇOS, META, LANCTO MANUAL)
- Tipo movimento (Select: TODOS, PRODUTOS, SERVIÇOS, DEVOLUÇÃO, FATURAMENTO MAN)
- Switch "Somente com revenda"

### 3. Botões no header
No `PageHeader actions` garantir os 3 botões na ordem:
`[Consultar] [Exportar Excel] [Atualizar Comercial]`
- Consultar dispara `consultar()` (mesmo do FilterPanel)
- Exportar usa `<ExportButton>` existente
- Atualizar Comercial abre `AlertDialog` de confirmação

### 4. Ordem das seções
Validar layout vertical:
1. Cards de KPIs (Valores + Volume via `KpiGroup`)
2. Tabela por Revenda
3. Tabela por Origem
4. Tabela por Mês
5. Detalhe (NF/Pedido/Produto) com paginação
6. Nota técnica em rodapé

### 5. Permissão de acesso
Item já foi inserido em `profile_screens` para todos os perfis na migration anterior. Confirmar que o usuário fez reload — caso ainda não apareça no menu, orientar logout/login para recarregar permissões.

### Arquivos afetados
- `src/pages/FaturamentoGeniusPage.tsx` — corrigir Selects (warning), garantir todos os filtros, ordem dos botões e seções.

### Garantias
- Sem alterações em outras páginas, na API ou em cálculos.
- Nenhum dado mockado.
- Token continua via `api` (Bearer no localStorage).

