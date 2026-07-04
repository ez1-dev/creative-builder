## Objetivo
Eliminar o grupo "Outros (legado)" distribuindo todos os itens em grupos de negócio adequados. Criar novos grupos onde faz sentido. Apenas reorganização visual em `src/components/AppSidebar.tsx` — nenhuma rota, permissão ou lógica muda.

## Novo mapeamento

**Cadastros** (existente) — adicionar sub-grupos:
- *Produtos*: Produtos (já existe)
- *Engenharia de Produto*: Estrutura Multinível (`/bom`), Onde Usa (`/onde-usa`)

**Estoque** (NOVO grupo, ícone `Warehouse`)
- Consulta de Estoques (`/estoque`)
- Estoque Min/Max (`/estoque-min-max`)
- Sugestão Min/Max (`/sugestao-min-max`)

**Suprimentos / Compras** (NOVO grupo, ícone `ShoppingCart`)
- Painel de Compras (`/painel-compras`)
- Compras/Custos (`/compras-produto`)
- Compras e Recebimentos (`/demonstrativo-compras-recebimentos`)
- NF Recebimento (`/notas-recebimento`)

**Produção** (existente) — dentro de *Obras e Expedição* adicionar:
- Reserva Nº Série (`/numero-serie`)

**Comercial / Faturamento** (existente) — adicionar:
- Faturamento Genius (`/faturamento-genius`)
- Auditoria Apont. Genius (`/auditoria-apontamento-genius`)

**Fiscal** (NOVO grupo, ícone `FileCheck`)
- Auditoria Tributária (`/auditoria-tributaria`)
- Conciliação EDocs (`/conciliacao-edocs`)

**Financeiro** (NOVO grupo, ícone `HandCoins`)
- Contas a Pagar (`/contas-pagar`)
- Contas a Receber (`/contas-receber`)

**Controladoria** (existente) — adicionar fora do sub-grupo DRE, como item direto:
- Balanço (`/contabilidade/balanco`)

**Manutenção** (NOVO grupo, ícone `Cog`)
- Manutenção de Frota (`/frota`)
- Manutenção de Máquinas (`/manutencao-maquinas`)

**Administração** (existente) — adicionar:
- Passagens Aéreas (`/passagens-aereas`)

## Ordem final dos grupos no menu

1. Início
2. Cadastros
3. Estoque *(novo)*
4. Suprimentos *(novo)*
5. Produção
6. Comercial / Faturamento
7. Fiscal *(novo)*
8. Financeiro *(novo)*
9. Controladoria
10. Manutenção *(novo)*
11. BI e Dados
12. RH
13. Regras Senior
14. Relatórios
15. Administração

## Remoção
- Bloco `OUTROS` e o `SidebarGroup` "Outros" no rodapé são removidos por completo (todos os itens migraram).

## Não muda
- Rotas, permissões, favoritos, busca, accordion exclusivo, modo colapsado
- Tipografia recém-ajustada
- Nenhum outro arquivo é tocado
