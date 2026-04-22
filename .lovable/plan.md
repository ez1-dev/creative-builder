

## Drawer de detalhes da OP com apontamentos

### Escopo
Permitir clique na coluna `numero_op` (sticky) da tabela em `/auditoria-apontamento-genius` para abrir um drawer lateral com os dados completos da OP selecionada e a lista de todos os apontamentos relacionados retornados pelo backend.

### Comportamento
- Ao clicar no número da OP, abrir `Sheet` (lateral direita, largura ~640px) com:
  - **Cabeçalho:** número da OP, origem, status da OP (badge colorido) e produto.
  - **Bloco "Dados da OP":** `numero_op`, `origem`, `codigo_produto`, `descricao_produto`, `status_op`, `quantidade` (se vier no contrato), datas (`data_inicio`/`data_fim` se existirem).
  - **Bloco "Apontamentos vinculados":** tabela compacta com todas as linhas do dataset atual cujo `numero_op + origem` coincidem com a OP clicada, mostrando: `data_apontamento`, `hora_inicio`, `hora_fim`, `horas_apontadas`, `nome_usuario` (com fallback `cód: X`), `status_apontamento` (badge).
  - **Rodapé do bloco:** totalizador "N apontamentos · X,XX h totais" e contagem por `status_apontamento`.
  - Quando todos os apontamentos vierem zerados/vazios, exibir um aviso amarelo curto reforçando que o backend não retornou dados de apontamento para essa OP.

### Implementação
**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. Adicionar state `opSelecionada: AuditoriaApontamentoGeniusItem | null` e `drawerAberto: boolean`.
2. Tornar a célula da coluna `numero_op` clicável: substituir o render atual por um `<button>` com `text-primary underline underline-offset-2 hover:text-primary/80` que chama `setOpSelecionada(row); setDrawerAberto(true)`.
   - Não usar `onRowClick` da `DataTable` para evitar conflito com a busca/sort e manter clique restrito à coluna OP.
3. Derivar via `useMemo` a lista `apontamentosDaOp` filtrando `dadosFiltrados` (ou `dados`) por `numero_op === opSelecionada.numero_op && origem === opSelecionada.origem`.
4. Renderizar `<Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>` com `SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto"` contendo `SheetHeader` + os blocos descritos.
5. Reaproveitar `formatarHorasApontadas`, `formatarDataApontamento` e os badges de status já existentes na página para manter consistência visual.
6. Ao limpar filtros / nova consulta, fechar drawer e zerar `opSelecionada`.

### Fora de escopo
- Nova chamada ao backend (drawer trabalha sobre o dataset já carregado).
- Edição de dados.
- Mudança no contrato `/api/auditoria-apontamento-genius`.
- Exportação específica do drawer.

### Resultado
O usuário consegue clicar em qualquer OP da grade e ver, num painel lateral, todos os apontamentos retornados para aquela OP no período consultado, facilitando a conferência caso a caso de por que `horas_apontadas` está zerada.

