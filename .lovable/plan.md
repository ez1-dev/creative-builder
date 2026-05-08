## Diagnóstico

Olhei os dados no banco: existe layout customizado salvo (ex.: `chart-top-uf` com `hidden:true`, alturas/posições diferentes do default), então em algum momento o save funcionou. Mas as edições novas voltam ao recarregar — sintoma típico de **erro silencioso** no `update`.

Olhando `src/hooks/usePassagensLayout.ts` no `saveLayout`:

```ts
await Promise.all(next.map(async ({ type, layout, hidden }) => {
  const ex = byType.get(type);
  if (!ex) return;                              // 1) pula sem avisar
  await supabase.from('dashboard_widgets')
    .update({ layout, config: nextConfig })
    .eq('id', ex.id);                           // 2) erro nunca capturado
}));
```

Dois problemas:

1. **Erros do Postgres/RLS são engolidos** — a chamada nunca lê `error`, então mesmo que a RLS bloqueie ou o JSON seja inválido, o `await saveLayout()` resolve sem throw e o componente exibe "Layout salvo".
2. **A RPC `upsert_passagens_dashboard_default` é chamada toda vez no início do save** e ela contém um `DELETE FROM dashboard_widgets WHERE type NOT IN (...)`. Se o cliente envia um tipo que não está na whitelist da função (ex.: edição feita antes do deploy mais novo da função), o widget é apagado a cada save — fonte recorrente de "volta ao anterior".

## Correção

### 1. Capturar erros no `saveLayout` (fonte do silêncio)

Em `src/hooks/usePassagensLayout.ts`:
- Trocar `Promise.all(map(async...))` por loop que coleta `{ data, error }` de cada update.
- Se `error` ocorrer, fazer `throw new Error(...)` com a mensagem agregada para o componente exibir no toast vermelho.
- Adicionar `.select('id')` no update para detectar quando 0 linhas foram afetadas (sinal de RLS bloqueando).

### 2. Tornar o save independente da RPC de defaults

A RPC só serve para **garantir** que o dashboard e seus widgets existam. Não precisa rodar em todo save.
- Chamar `upsert_passagens_dashboard_default` apenas quando `byType` retornar vazio (primeira vez).
- Se algum `type` do payload não está em `byType` após o fetch, fazer `INSERT` direto (em vez de pular silenciosamente).

### 3. Garantir que widgets ocultos preservem layout

No `PassagensDashboard.tsx`, o `pendingLayout` só contém widgets visíveis (o grid filtra `hidden`). O save já tenta cobrir os ocultos via `widgets.find(...)`. Vou validar e — se necessário — adicionar fallback para o `layout` default canônico quando o widget oculto ainda não tem registro no banco.

### 4. Validação rápida pós-fix

Após o ajuste:
- Fazer 3 edições (mover, redimensionar, ocultar), salvar, dar F5, conferir persistência via tela e via `dashboard_widgets`.
- Se ainda falhar, o novo erro/toast vai dizer exatamente qual update foi rejeitado (RLS, tipo inválido, etc.) e atacamos o caso real.

## Detalhes técnicos

- Sem mudança de schema do banco; nenhuma migração necessária nesta etapa.
- Sem alteração de UI/UX — apenas tratamento de erro e ordem de chamadas no hook.
- Arquivos afetados: `src/hooks/usePassagensLayout.ts` (principal). Ajuste menor em `PassagensDashboard.tsx` apenas se a etapa 3 exigir.
