
# ERP Web - Frontend React para API FastAPI

## Visão Geral
Desenvolver o frontend React completo para consumir a API FastAPI ERP existente (rodando em localhost). O design seguirá o estilo atual do sistema — funcional, com tabelas de dados, filtros, KPIs e navegação por abas.

## Configuração
- URL base da API configurável (padrão: `http://localhost:8000`)
- Serviço de API centralizado com interceptor de token JWT
- Re-autenticação automática quando o token expirar

## Módulos

### 1. Login
- Tela de login com usuário e senha
- Armazenamento do token JWT
- Redirecionamento automático se não autenticado

### 2. Layout Principal
- Sidebar ou tabs para navegar entre os módulos
- Header com nome do usuário logado e botão de logout
- Estilo corporativo similar ao atual (azul, tabelas com header colorido)

### 3. Estoque
- Filtros: código, descrição, família, origem, depósito, "somente com estoque"
- Tabela paginada com os dados de saldo
- Botão de exportar Excel

### 4. Onde Usa
- Filtros: código componente, derivação, código modelo
- Tabela paginada mostrando onde o componente é utilizado
- Exportação Excel

### 5. Estrutura (BOM)
- Campo para código do modelo e derivação
- Exibição hierárquica da estrutura (árvore/tabela com indentação por nível)
- Indicadores visuais de ciclos e modelos filhos
- Exportação Excel

### 6. Compras / Custos do Produto
- Filtros completos (código, descrição, família, origem, derivação, OC aberta)
- Tabela com dados de última NF, preço médio, OCs abertas
- Exportação Excel

### 7. Painel de Compras
- **Dashboard** com KPIs: total OCs, valor líquido, itens pendentes, atrasados
- Gráficos: top fornecedores, situações, tipos, famílias, entregas por mês
- **Lista detalhada** com filtros avançados (item, fornecedor, projeto, centro de custo, datas, valores, situação)
- Agrupamento por fornecedor
- Paginação e exportação Excel

### 8. Engenharia x Produção
- Filtros: unidade de negócio, projeto, desenho, revisão, OP, origem, família, datas, status
- KPIs: total projetos, kg engenharia, kg produzido, kg estoque, % atendimento
- Tabela com barras de progresso visuais para atendimento
- Exportação Excel

### 9. Auditoria Tributária
- Filtros: código, descrição, família, origem, NCM, CST, transação, checkboxes de divergência
- KPIs: total, NCM vazio, CST vazio, divergências
- Tabela com status coloridos (Ok, Parcial, etc.)
- Exportação Excel e CSV (com limite de linhas para Excel)

## Componentes Reutilizáveis
- `DataTable` — tabela com paginação, filtro local, cabeçalho fixo
- `FilterPanel` — painel de filtros colapsável
- `KPICard` — card de indicador
- `ExportButtons` — botões de exportação (Excel/CSV) com download direto
- `Pagination` — controle de paginação

## Estrutura de Páginas
- `/login` — Tela de login
- `/estoque` — Consulta de estoque
- `/onde-usa` — Onde usa
- `/bom` — Estrutura/BOM
- `/compras-produto` — Compras e custos
- `/painel-compras` — Painel de compras (dashboard + lista)
- `/engenharia-producao` — Engenharia x Produção
- `/auditoria-tributaria` — Auditoria Tributária
