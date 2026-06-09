## Objetivo

Permitir que cada usuário com acesso ao `/bi/comercial` tenha o **seu próprio dashboard pessoal**, sem afetar o dashboard "oficial" da empresa. O padrão continua sendo a fonte de verdade visualizada por todos por default; ao clicar em **"Personalizar minha versão"**, o usuário cria uma cópia individual e passa a editar essa cópia. Só **Administradores** editam o oficial.

## Modelo de dados (reaproveita o que já existe)

A tabela `dashboards` já tem `owner_id` (nullable). Hoje o BI Comercial usa só o registro com `owner_id IS NULL` (oficial). Vamos passar a usar:

- `owner_id IS NULL` → dashboard **oficial** (único, editável só por admin).
- `owner_id = auth.uid()` + `module = 'bi-comercial'` → dashboard **pessoal** do usuário (criado sob demanda copiando o oficial).

`dashboard_widgets` e `dashboard_blocks` já referenciam `dashboard_id`, então não muda estrutura — só passamos a ter mais de um dashboard por módulo.

## Mudanças

### 1. Migração (Cloud)

- Criar RPC `fork_bi_comercial_dashboard()` (SECURITY DEFINER): se o usuário ainda não tem dashboard pessoal de `bi-comercial`, copia o oficial (dashboard + blocks + widgets) para um novo `dashboards` com `owner_id = auth.uid()` e retorna o id. Se já existe, retorna o id existente. Idempotente.
- Criar RPC `reset_bi_comercial_personal_dashboard()`: apaga o dashboard pessoal do usuário (cascade nos widgets/blocks via FK existente) — usado quando ele quer "voltar ao padrão".
- Atualizar `can_edit_dashboard`: para `module = 'bi-comercial'`, retornar `true` se for dono OU se `owner_id IS NULL` e `is_admin(uid)`. Hoje retorna `true` para qualquer um — isso é o que precisa endurecer.
- Garantir GRANTs e policies (`dashboards` já tem policies de leitura própria + leitura de oficiais; checar se cobrem o caso novo).

### 2. `src/hooks/useComercialLayout.ts`

- Adicionar parâmetro/estado `mode: 'official' | 'personal'` persistido em `localStorage` por usuário (`bi-comercial:layout-mode`).
- `load()`: em `personal`, buscar `dashboards` com `owner_id = auth.uid()` e `module = 'bi-comercial'`; se não existir, fazer **fallback automático** para o oficial em modo somente-leitura (até o usuário clicar em "Personalizar").
- `ensureDashboard()`: em `personal`, chama RPC `fork_bi_comercial_dashboard` em vez do upsert do oficial.
- Novo helper `forkToPersonal()` e `resetPersonal()` expostos pelo hook.
- `canEdit` exposto pelo hook: `true` se modo = personal **ou** (modo = official **e** `isAdmin`).

### 3. `src/pages/bi/ComercialPage.tsx`

- Junto ao chip da unidade, adicionar um **toggle/segmented control** "Padrão da empresa" ↔ "Minha versão" (só aparece se o usuário NÃO for admin; admin vê os dois mas sempre pode editar).
- Botão "Editar dashboard" só habilitado se `canEdit` (do hook).
- Ao ativar "Minha versão" pela primeira vez, abrir confirm: "Criar sua cópia pessoal do dashboard? Você poderá editá-la livremente sem afetar a versão oficial."
- Em "Minha versão", adicionar no menu de ações um item "Restaurar para o padrão da empresa" → chama `resetPersonal()` + recarrega.
- Indicador visual sutil: badge "Minha versão" / "Oficial" no topo da página.

### 4. Permissão de edição do oficial (admin-only)

- No frontend: esconder/desabilitar botões de edição quando `mode === 'official'` e usuário não é admin (já temos `useUserPermissions` + `is_admin`).
- No backend: a função `can_edit_dashboard` (item 1) bloqueia tentativas de save mesmo se o cliente burlar.

### 5. Migração silenciosa do dashboard atual

- Nada a migrar de dados: o oficial atual continua sendo o oficial. Usuários começam vendo o oficial e, se quiserem, criam a cópia pessoal.

## Fora de escopo

- Múltiplos dashboards por usuário (segunda opção do menu) — fica para depois.
- Compartilhamento de dashboard pessoal com outros usuários.
- Replicar essa lógica em outros módulos (Passagens, Frota, Máquinas, Programação) — só BI Comercial agora.
- Não muda dados/drill/IA/sincronizações.

## Validação

- Criar usuário comum: ver o oficial em modo leitura, botão "Editar" desabilitado.
- Clicar "Personalizar minha versão" → cópia criada → consegue editar/salvar layout sem afetar outros usuários.
- Logar como admin: consegue editar o oficial; usuários comuns veem a alteração na visualização "Padrão da empresa".
- "Restaurar para o padrão": dashboard pessoal removido, usuário volta a ver o oficial.
