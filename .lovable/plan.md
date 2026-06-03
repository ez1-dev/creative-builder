## Objetivo

Evitar que o frontend mande o código textual da ação (ex.: `VM_FATURAMENTO`) na URL do endpoint `POST /api/etl/acoes/{ref}/testar-sql`, e garantir codificação segura do segmento.

## Mudanças

### 1. `src/lib/etl/api.ts`
- Trocar assinatura de `testarSqlAcao`:
  - de `(idAcao: string, payload: TestarSqlPayload)`
  - para `(acaoRef: string | number, payload: TestarSqlPayload)`
- Montar URL com `encodeURIComponent(String(acaoRef))`.
- Body permanece `{ sql_template?, parametros, limite? }`. Nenhuma outra função muda.

### 2. `src/components/etl/EditarSqlModal.tsx` (linha 203)
- Trocar `testarSqlAcao(acao.id_acao, …)` por `testarSqlAcao(acao.id, …)`.
- `acao.id` é o UUID da row em `etl_acoes` (campo já existente no tipo `EtlAcao`). Não existe `codigo_acao` no schema atual, então uso direto `acao.id` (mais estável que `id_acao`, que é texto livre como "VM_FATURAMENTO").

### 3. `executarAcao` (mesmo arquivo `api.ts`)
- **Não vou mexer agora.** A mensagem foca em `testarSqlAcao`. `executarAcao` segue recebendo `idAcao: string` e é chamado em `EtlTarefaDetalhePage` com `r.id_acao` — se o backend também precisar do UUID lá, faço num passo separado quando confirmado. Aviso isso no fim.

## Onde NÃO mexer

- `FaturamentoGeniusPage.tsx` linha 729 — `VM_FATURAMENTO` aparece apenas em texto de UI ("Deseja atualizar VM_FATURAMENTO…"), não em chamada de API. Fica como está.
- `src/integrations/supabase/{client,types}.ts` e `.env` — proibido editar.

## Observação para você

Depois desse ajuste, o endpoint `POST /api/etl/acoes/{acaoRef}/testar-sql` vai receber o **UUID** da ação (ex.: `8f3a…`) em vez de `VM_FATURAMENTO`. Garanta que o FastAPI faça o lookup em `etl_acoes` por `id` (UUID) — não por `id_acao` (texto). Se quiser manter compatibilidade com o código textual, o backend pode tentar `id` primeiro e cair para `id_acao` no fallback.
