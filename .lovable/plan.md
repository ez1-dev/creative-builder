## Objetivo
Ao selecionar uma OP no autocomplete (aba "Buscar OP"), o usuário precisa perceber duas coisas imediatamente:
1. A consulta da OP disparou automaticamente (feedback visual claro).
2. A OP escolhida fica destacada no campo e no dropdown quando reaberto.

## Diagnóstico
Em `src/components/producao/OpAutocomplete.tsx` o check da seleção compara `String(op.num_orp) === value`, mas `value` recebido do container é apenas `numorp` sem `codori` — colisões e falha em destacar. Além disso, ao selecionar, o popover fecha e nada sinaliza que a consulta começou; o `renderResumoOp` só aparece abaixo quando `op.isLoading/data` mudam, sem indicação visual no próprio campo.

Em `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` o `handleSelectOp` já dispara `setBuscar(...)` (o que aciona `useOpConsulta`), então a consulta *acontece* — só falta comunicá-la.

## Mudanças

### 1. `OpAutocomplete.tsx`
- Adicionar props opcionais `selectedKey?: string` e `loading?: boolean` para o container informar a OP atualmente selecionada (`${cod_ori}-${num_orp}`) e se há consulta em andamento.
- Trocar o critério do ícone `Check` para comparar contra `selectedKey` (mesma chave usada em `CommandItem`).
- Reordenar `results` colocando o item selecionado no topo quando o popover abrir.
- No botão trigger:
  - Quando `loading`, mostrar `Loader2` girando ao lado do texto e trocar o `ChevronsUpDown` por spinner.
  - Quando há `value`, aplicar destaque visual (borda `ring-1 ring-primary/40` + `bg-primary/5`) para deixar claro que há OP selecionada.
- Manter debounce/limpeza atuais.

### 2. `NovaRequisicaoOpPage.tsx`
- Passar `selectedKey={codori && numorp ? \`${codori}-${numorp}\` : undefined}` e `loading={op.isFetching}` ao `<OpAutocomplete>`.
- Logo abaixo do autocomplete (aba "Buscar OP"), renderizar um chip inline de status quando houver `buscar`:
  - `op.isFetching`: "Consultando OP {codori}/{numorp}…" com spinner.
  - `op.isError`: "Falha ao consultar" + botão "Tentar novamente".
  - `op.data`: "OP {codori}/{numorp} carregada" em verde.
- Emitir `toast.success('OP {codori}/{numorp} selecionada, consultando…')` dentro de `handleSelectOp` quando `co && no` (usa o `sonner` já disponível no projeto).
- Ajustar o texto auxiliar para: "A seleção dispara a consulta automaticamente."

## Fora do escopo
- Não alterar `useOpConsulta`, o serviço de busca (`searchOps`), nem regras de negócio/gating.
- Aba "Informar manualmente" segue como está (já tem botão explícito).
