

# Adicionar filtro "Situação NF" na página de Notas de Recebimento

## Alteração: `src/pages/NotasRecebimentoPage.tsx`

1. Adicionar `situacao_nf: ''` ao estado `filters` e ao `clearFilters`
2. Adicionar um `<Select>` no `<FilterPanel>` com as opções:
   - Todas (valor vazio)
   - Situação 1 a 5
3. O parâmetro `situacao_nf` já será enviado como query param na chamada `api.get('/api/notas-recebimento', params)` -- basta incluí-lo no objeto filters e remover quando vazio (mesmo padrão dos outros filtros)

O componente usará o mesmo `<Select>` (Radix) já usado no filtro "Tipo Item", mantendo consistência visual.

## Detalhes técnicos

- No `search()`, adicionar lógica para deletar `params.situacao_nf` quando vazio (padrão existente)
- Não é necessário adicionar coluna na tabela pois é apenas filtro
- Backend precisa receber o param `situacao_nf` e aplicar `WHERE E440NFC.SITNFC = ?`

