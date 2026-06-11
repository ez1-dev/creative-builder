## Problema

No BI Comercial (referenciado como "BI Financeiro"), quando um usuário não-admin edita layout/widgets e salva, as alterações **não persistem** na "versão dele". Os edits são descartados silenciosamente.

### Causa raiz

Em `src/hooks/useComercialLayout.ts`, o modo (`official` vs `personal`) é salvo apenas no `localStorage` e começa como `official`. Quando o usuário edita sem antes clicar em "criar minha versão", o `saveLayout` chama `ensureDashboard()` que retorna o **dashboard oficial** (`owner_id IS NULL`). 

As políticas RLS de `dashboards` / `dashboard_widgets` / `dashboard_blocks` só permitem `UPDATE/INSERT/DELETE` no dashboard oficial para **admins** (módulos `frota` e `passagens-aereas` têm exceção, mas `bi-comercial` não). Resultado: o `UPDATE` é silenciosamente bloqueado pelo RLS (0 linhas afetadas, sem erro), o `load()` recarrega do banco e o usuário vê tudo voltar ao que era.

Além disso, o código **não verifica o `error`** dos `supabase.from(...).update/insert/delete`, então nenhuma mensagem aparece.

## Solução

Garantir que qualquer edição de um não-admin sempre vá para um dashboard pessoal (auto-fork), e expor erros que aconteçam ao salvar.

### Mudanças

**1. `src/hooks/useComercialLayout.ts`**

- Adicionar helper `isAdmin()` (usar `supabase.rpc('is_admin', { _uid })` ou checar via `useIsSeniorAdmin` — preferir RPC já existente). Cachear o resultado em estado.
- Em `ensureDashboard()`: antes de devolver o `dashId` oficial, se `effectiveMode === 'official'` e o usuário **não for admin**, chamar `forkToPersonal()` automaticamente e usar o id pessoal. Isso muda o modo para `personal` e cria o dashboard pessoal se não existir (a RPC `fork_bi_comercial_dashboard` já é idempotente).
- Em `saveLayout`, `deleteWidget` e `resetLayout`: passar a checar `error` de cada chamada Supabase. Se houver erro, lançar para o caller mostrar toast (os callers já usam `try/catch` com `toast.error`).
- Em `resetLayout` quando `isPersonalEffective` é falso e o usuário não é admin: redirecionar para `resetPersonal()` em vez de deletar widgets do oficial.

**2. UX — aviso explícito**

No componente que consome o hook (provavelmente `src/pages/BiComercialPage.tsx` ou similar — confirmar na implementação), exibir um `toast.info` (curto, uma vez por sessão) quando o auto-fork acontecer: *"Editamos sua versão pessoal do BI Comercial. As alterações não afetam a versão oficial."*

### Fora de escopo

- Não mexer em RLS nem em RPCs do banco — a infra de fork já existe.
- Não mexer nos módulos Frota / Máquinas / Passagens (lá, editores não-admin já têm permissão no oficial via `can_edit_*`).
- Sem mudanças visuais no layout dos cards.

## Validação

1. Logar como usuário não-admin, abrir BI Comercial, mover/redimensionar um widget, recarregar — alteração deve persistir.
2. Confirmar no banco que foi criada uma linha em `dashboards` com `module='bi-comercial'` e `owner_id` = id do usuário.
3. Logar como admin — comportamento atual preservado (edita o oficial quando em modo official).
