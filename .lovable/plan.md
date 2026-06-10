## Contexto

O painel TAUX já está acoplado em `/etl` (card `TauxPanel`) com KPIs, status, sync individual/global e visualização. Este plano cobre **apenas o que ainda não existe** no spec do usuário, sem mexer em módulos comerciais nem no fluxo já validado.

## O que falta

### 1. `src/lib/bi/tauxApi.ts` — pequenos ajustes
- Adicionar à `TAUX_LIST` as duas constantes que faltam: `TAUX_LOCAL_SN` e `TAUX_PROD`.
- Em `getTauxStatus`, também aceitar a chave `dados` da resposta (além de `data` / `items` já cobertos via `pickList`) e mapear `tabela_supabase` → `tabela` quando o backend usar o nome da spec.
- `syncTaux(tabelas?)`:
  - Quando `tabelas` for `undefined`/vazio → enviar `{ acionado_por: 'MANUAL', limpar_antes: false }` (sem o campo `tabelas`, conforme spec “sincronizar todas”).
  - Quando vier lista → `{ tabelas, acionado_por: 'MANUAL', limpar_antes: false }`.
- Nova função `getTauxLog(limit = 100)` → `GET /api/bi/taux/log?limit=...`, retornando array tipado `TauxLogEntry { nome_tabela, tabela_supabase, status, qtd_linhas, erro, acionado_por, iniciado_em, finalizado_em }`.

### 2. Novo `src/components/etl/TauxLogDialog.tsx`
- Modal acionado por um botão **"Ver log"** no header do `TauxPanel`.
- Tabela com as colunas do spec; mesmas cores de status já usadas no painel (verde/azul/amarelo/cinza/vermelho).
- Botão **Atualizar** + auto-refresh a cada 10 s enquanto aberto.
- Tooltip com `erro` quando houver.

### 3. `TauxPanel.tsx` — wire-up mínimo
- Adicionar botão **"Ver log"** ao lado de "Sincronizar todas as TAUX".
- Estado `logOpen` + render do `<TauxLogDialog />`.
- Sem outras mudanças visuais.

### 4. Novo utilitário de filtros futuros: `src/lib/bi/tauxFilterApi.ts`
Helpers simples que apenas envelopam `getTauxData` para os filtros listados no spec (clientes, produtos, representantes, famílias, filiais, centro de custos). Cada um aceita `(q, limit?)` e devolve `{ value, label }[]` heurístico (primeiro campo string como label, primeiro campo `*_id`/`codigo`/`id` como value). Não consumido por ninguém ainda — pronto para os próximos painéis.

### 5. Não fazer
- Não criar rota `/bi/taux` (foi removida por decisão anterior do usuário).
- Não tocar em `TauxViewerDialog`, módulos comerciais, compras, recebimentos ou faturamento.
- Não adicionar tratamento custom de 401 (já coberto centralmente em `src/lib/api.ts`).

## Arquivos

- editar `src/lib/bi/tauxApi.ts`
- criar `src/components/etl/TauxLogDialog.tsx`
- editar `src/components/etl/TauxPanel.tsx`
- criar `src/lib/bi/tauxFilterApi.ts`
