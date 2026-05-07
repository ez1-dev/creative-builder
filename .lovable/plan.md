# Expandir tabela "Registros" de Passagens Aéreas

## Objetivo
Mostrar na lista de registros todas as colunas pedidas:
`data_registro, colaborador, centro_custo, projeto_obra, fornecedor, cia_aerea, numero_bilhete, localizador, origem, destino, uf_destino, data_ida, data_volta, motivo_viagem, tipo_despesa, valor`.

## Observação importante sobre `cep_destino`
A tabela `passagens_aereas` **não tem** o campo `cep_destino` — só existe `uf_destino` (UF derivada automaticamente do destino). Vou usar `uf_destino` no lugar. Se você realmente quiser CEP, preciso adicionar uma coluna nova no banco e popular via geocoder; me avise.

## Mudanças

### `src/components/passagens/PassagensDashboard.tsx` (card "Registros")
1. Substituir o `<TableHeader>` atual (7 colunas) por 16 colunas, na ordem solicitada.
2. Renderizar todas as células correspondentes em:
   - Modo lista (`pagedRows.map`)
   - Modo agrupado por colaborador (`g.registros.map`) — esconde a coluna "Colaborador" como já faz hoje
3. Ajustar `baseCols` / `colSpan` do cabeçalho de grupo, do "Subtotal" do footer e dos estados "Carregando…/Nenhum registro".
4. Tornar a tabela rolável horizontalmente (wrapper `overflow-x-auto`) e aplicar `whitespace-nowrap` nas células para evitar quebra.
5. Larguras: usar `text-xs`/`px-2 py-1.5` mais compactos só nesse card para caber bem; coluna Valor permanece alinhada à direita.
6. Origem e Destino voltam a ser **duas colunas separadas** (hoje aparecem como "Origem → Destino" combinado).

### Sem mudanças em backend, schema ou exportação.
Exportações CSV/XLSX já contêm todos os campos.
