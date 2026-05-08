## Diagnóstico
"Editar layout" em `/passagens-aereas` aparece só para **admin do sistema**. Dois pontos travam a Maiane:

1. **Frontend** — `src/components/passagens/PassagensDashboard.tsx` (linha 125):
   ```ts
   const canEditLayout = !readOnly && isAdmin && !shareToken;
   ```
   `isAdmin` vem de `usePassagensLayout`, que chama `rpc('is_admin', …)`. Maiane não é admin → botão não aparece.

2. **Backend (RLS)** — Mesmo se o botão aparecesse, o `dashboard_widgets` do dashboard padrão (`owner_id IS NULL`) só permite escrita pela política **"Admins manage widgets of default dashboards"** (`is_admin(auth.uid())`). Qualquer UPDATE/INSERT/DELETE feito pela Maiane voltaria com erro.

A função `can_edit_passagens(_uid)` já existe e já é usada pelas políticas de `passagens_aereas` (CRUD da tabela). Vamos reutilizar para o layout.

## Plano

### 1. Migração de banco — afrouxar RLS para o dashboard padrão de passagens-aereas
Criar política adicional em `dashboard_widgets` (e `dashboards`, se necessário) permitindo gerenciar widgets quando:
- `dashboards.module = 'passagens-aereas'`
- `dashboards.owner_id IS NULL`
- `can_edit_passagens(auth.uid()) = true`

Manter as políticas existentes intactas (admins continuam podendo). Não mexer em outros módulos.

### 2. Frontend — `usePassagensLayout`
- Substituir a verificação `is_admin` pela `can_edit_passagens` (que já retorna true para admins também).
- Renomear o retorno `isAdmin` → `canEditLayout` (mantendo retrocompat: exporta os dois enquanto migramos consumidores).

### 3. Frontend — `PassagensDashboard.tsx`
- Trocar `isAdmin` por `canEditLayout` na linha 125.
- Verificar outros usos de `isAdmin` no arquivo (e.g., share, force_user_logout) — manter `isAdmin` real para o que **for exclusivo de admin** (links de compartilhamento já têm sua própria função `can_manage_passagens_share`). Avaliar item a item antes de trocar.

### 4. Validação
- Maiane logada → vê botão "Editar layout", consegue arrastar widgets, salvar e o save **não dá erro de RLS**.
- Outro usuário sem `can_edit` em `/passagens-aereas` continua **sem** o botão.
- Admin continua funcionando como antes.
- Link público (shareToken) continua read-only — `canEditLayout` é gated por `!shareToken`.

## Arquivos
- Migração SQL (nova)
- `src/hooks/usePassagensLayout.ts`
- `src/components/passagens/PassagensDashboard.tsx`