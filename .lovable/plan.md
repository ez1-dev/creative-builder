## Objetivo

Tirar a aba **Parâmetros de Recursos** da dependência do FastAPI. O CRUD da tabela `producao_recurso_unidade` passa a ler/gravar **direto no Lovable Cloud** via `@/integrations/supabase/client`. O cálculo da carga (Visão Geral, Centros, Detalhe) continua na API FastAPI.

A tabela já existe no Cloud com RLS adequada:
- `SELECT` liberado para qualquer usuário autenticado
- `INSERT/UPDATE/DELETE` restrito a administradores (`is_admin(auth.uid())`)

Nenhuma migration nova é necessária.

## Mudanças

### 1. `src/lib/producao/cargaApi.ts`
- Remover de `cargaApi` os métodos `listarParametros`, `criarParametro`, `atualizarParametro` (eram chamadas FastAPI).
- Manter `centros`, `detalhe`, `opcoes`, `urlExportarCentros` apontando para a API.
- Manter os tipos `ParametroRecurso` e `ParametroRecursoPayload` para reuso na UI.

### 2. Novo `src/lib/producao/parametrosRecursosCloud.ts`
Wrapper fino sobre o cliente Cloud:
- `listar()` → `supabase.from('producao_recurso_unidade').select('*').order('codemp').order('codcre')`
- `criar(payload)` → `insert` retornando o registro
- `atualizar(id, payload)` → `update().eq('id', id)` retornando o registro
- `excluir(id)` (novo, opcional) → `delete().eq('id', id)`
- Tratamento de erro: lança `Error` com mensagem amigável quando RLS bloquear (mostrar "Apenas administradores podem alterar parâmetros de recursos").

### 3. `src/hooks/useCargaProducao.ts`
- `useParametrosRecursos` passa a chamar `parametrosRecursosCloud.listar()` em vez de `cargaApi.listarParametros()`.
- Adicionar `useIsAdmin` (reaproveitar hook existente se houver) para habilitar/desabilitar botões de edição.

### 4. `src/components/producao/carga/ParametrosRecursosTab.tsx`
- Mostrar botões "Novo" e "Editar" apenas se o usuário for admin.
- Mensagem amigável quando não houver permissão.
- (Opcional) Adicionar botão de excluir para admins.

### 5. `src/components/producao/carga/ParametroRecursoDialog.tsx`
- Trocar chamadas `cargaApi.criarParametro` / `cargaApi.atualizarParametro` por `parametrosRecursosCloud.criar` / `.atualizar`.
- Manter validação atual (zod + react-hook-form).
- Toast de erro específico para erros de RLS (admin only).

### 6. Aviso na tela de Carga (Visão Geral / Centros / Detalhe)
Quando a API FastAPI ainda devolver o erro `Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY`, exibir um banner explicativo informando que o cálculo da carga depende da configuração no servidor FastAPI (não bloqueia a aba Parâmetros, que agora roda 100% no Cloud).

## Fora de escopo

- Nenhuma alteração no FastAPI.
- Cálculo de carga (`/api/producao/carga/centros`, `/detalhe`, `/opcoes`) continua na API — esses endpoints precisam que o time configure `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` no servidor FastAPI para conseguir ler `producao_recurso_unidade` server-side.
- Não criar nova tabela nem alterar RLS.
- Não expor service role key no frontend.

## Resultado esperado

- Aba **Parâmetros de Recursos**: funciona imediatamente, sem depender do FastAPI.
- Abas **Visão Geral / Centros / Detalhe**: continuam dependentes do FastAPI; quando o backend estiver configurado, voltam a funcionar normalmente. Enquanto isso, mostram aviso claro.