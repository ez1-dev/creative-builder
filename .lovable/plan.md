## Observações da OP — fora da impressão, disponíveis na grid

### Objetivo

Remover o bloco "Observações" da área de impressão da OP e expor as observações apenas na grid, via modal sob demanda.

### Mudanças

**1. `src/components/producao/OpPrintSheet.tsx`** — remover o bloco "Observações" do `renderFooter()` (linhas 263–270). O `renderFooter` passa a renderizar apenas `op-responsability` + `op-footer`. Não imprimir observações por padrão.

Defesa extra: se algum dia o backend retornar `data.modo_impressao?.imprimir_observacoes === false`, ainda assim nada é renderizado (comportamento agora é sempre `N` por padrão).

**2. `src/lib/producao/opImpressao.ts`** — adicionar tipos opcionais:
- Em `OpImpressao`: `modo_impressao?: { imprimir_observacoes?: boolean }`.
- (Os campos `tem_observacao` / `qtd_observacoes` na opção da grid já são `any` em `OpcaoOp`, sem mudança obrigatória.)

**3. Hook `useImpressaoOrdemProducao` / `handleRowSelect` / `imprimirSelecionadas` / `fetchImpressaoLote`** — não enviar `imprimir_observacoes` (já não enviam). Nada a alterar; apenas confirmar que continua assim. Documentar a regra no comentário do payload.

**4. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`** — grid de OPs:

- Nova coluna "Observações" entre "C. Recurso" e "Geração".
- Conteúdo da célula:
  - Se `op.tem_observacao === 'S'` ou `Number(op.qtd_observacoes) > 0` → botão ícone "Ver observações" (com `e.stopPropagation()` no `onClick` para não disparar `handleRowSelect`).
  - Caso contrário → `—`.
- Novo handler `handleVerObservacoes(op)`:
  - `setObsTarget({ cod_emp, cod_ori, num_orp })`
  - `setObsLoading(true)`; chama `api.get('/api/producao/ordem-producao/observacoes', { cod_emp, cod_ori, num_orp })`
  - guarda em `obsData` (array `{ tipo, sequencia, observacao }`).
- Novo `<Dialog>` no fim da página (com `className="no-print"` no `DialogContent`):
  - Título: `Observações da OP {cod_ori}/{num_orp}`.
  - Loading → "Carregando observações...".
  - Erro → mensagem destrutiva + botão fechar.
  - Lista vazia → "Nenhuma observação encontrada."
  - Caso contrário → `<Table>` com colunas `Tipo`, `Sequência`, `Observação`.

**5. CSS** — não precisa alterar `op-print.css`. O bloco foi removido do JSX, então não ocupa espaço algum na página de impressão.

### Fora de escopo

- Backend (`/observacoes` será chamado conforme contrato informado pelo usuário; nenhuma mudança aqui).
- Opção futura "Imprimir observações" — não implementada agora; a flag `imprimir_observacoes` permanece `N` (não enviada).
- Alterações em `OpPrintBatch` — não renderiza observações; nada a fazer.
