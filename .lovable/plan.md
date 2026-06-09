## Objetivo

Adicionar suporte a **agrupamento por colunas** com **soma automática nas colunas numéricas** diretamente na `DataTableBI` (wrapper sobre `src/components/erp/DataTable.tsx`). Como é feito no componente base, todos os consumidores ganham o recurso de uma vez: drill do BI Comercial, tabelas mensais do `/bi/comercial`, `FaturamentoValidacao` e qualquer outra tela que use `DataTableBI`.

Sem mexer em filtros por coluna (mantém só a busca global Ctrl+K já existente).

## Como vai funcionar

1. **Barra "Agrupar por"** acima da tabela (ao lado da busca):
   - Seletor multi-coluna estilo chips (mesma UX da `GroupByBar` usada em Produção/Carga).
   - Botões **Expandir tudo / Recolher tudo**.
   - Quando nenhum agrupamento está selecionado, a grid se comporta exatamente como hoje.

2. **Linhas de grupo** (quando há agrupamento ativo):
   - Cabeçalho do grupo com seta de expandir/recolher, rótulo (`coluna: valor`) e contagem de itens.
   - Soma exibida em cada coluna numérica do grupo, alinhada com a respectiva coluna da tabela (não num bloco separado).
   - Suporta agrupamento em múltiplos níveis (ex.: Ano/Mês → Cliente).

3. **Detecção de colunas numéricas**:
   - Automática: percorre a primeira página de dados; coluna onde >80% dos valores não-nulos são `number` vira "somável".
   - Override opcional via `Column.aggregate?: 'sum' | 'none'` para casos em que o número não deve ser somado (ex.: códigos, anomes, ticket médio).
   - Ticket Médio / Preço Médio: por padrão **não** somam — vão entrar na lista de exceções (`aggregate: 'none'`) onde for chamado, ou detectados pelo nome (`ticket_medio`, `preco_medio`, `media_*`).

4. **Interação com a busca e ordenação atuais**:
   - Busca global continua filtrando antes do agrupamento.
   - Ordenação dos grupos: por padrão pela soma da primeira coluna numérica desc (igual ao padrão de Produção). Clique no header continua ordenando linhas-folha dentro do grupo.

5. **Não interfere com `onRowClick`**: clique nas linhas-folha continua disparando o drill atual.

## Arquivos a alterar / criar

```text
src/components/erp/
  DataTable.tsx                  ← adiciona props groupable, aggregate por coluna, render de grupos
  DataTableGrouping.ts           ← novo: util de agrupamento + soma (reaproveita lógica do
                                   useTableGrouping de produção, adaptada para Column<T>)
  DataTableGroupBar.tsx          ← novo: barra de chips "Agrupar por" + expandir/recolher

src/components/bi/tables/
  DataTableBI.tsx                ← repassa novas props (groupable default = true para BI)
```

Sem alterações em backend, schema ou em qualquer página consumidora — elas herdam o recurso automaticamente. Páginas que quiserem desligar passam `groupable={false}`.

## Fora do escopo

- Filtros por coluna (texto/seleção/operadores). Fica para uma segunda rodada se quiser.
- Agregações além de soma (média, contagem, min, máx).
- Exportação considerando agrupamento.
- Tabelas de Produção/Carga (já têm seu próprio `GroupByBar`, ficam como estão).
