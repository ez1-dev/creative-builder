## Ajustes em Carga de Produção

Alinhar o frontend ao novo contrato da API: cálculo da carga não depende mais do Supabase, mapeamento pode vir de três origens, e a aba "Parâmetros de Recursos" passa a ser apenas leitura até definirmos onde a parametrização definitiva ficará.

### 1. Tipos e contrato da API (`src/lib/producao/cargaApi.ts`)

- Ampliar `OrigemMapeamento`:
  ```ts
  export type OrigemMapeamento = 'PADRAO_API' | 'REGRA_API' | 'SUPABASE';
  ```
- Renomear o KPI no resumo para refletir que o mapeamento não é mais "do Supabase":
  - manter o campo retornado pela API como está, mas tratar `linhas_sem_mapeamento_supabase` apenas como fallback. Se a API passar a expor `linhas_sem_mapeamento`, usar este; senão cair no antigo.
- Manter `ParametroRecurso` / `ParametroRecursoPayload` apenas como tipos de leitura (Payload deixa de ser usado para escrita, mas pode permanecer exportado para um uso futuro).

### 2. Visão Geral (`VisaoGeralTab.tsx`)

- Remover a detecção "Supabase não configurado" — não faz mais sentido, a API agora responde mesmo sem credenciais.
- Tratar erro de forma genérica (mensagem retornada + botão de recarregar implícito via React Query).
- Renomear o rótulo do KPI de "Sem mapeamento" para deixar explícito (continua "Sem mapeamento", apenas sem citar Supabase).
- Adicionar uma legenda discreta abaixo dos KPIs explicando as origens possíveis: `PADRAO_API`, `REGRA_API`, `SUPABASE`.

### 3. Detalhe de OPs (`DetalheOpsTab.tsx`)

- Garantir que a coluna/badge de `origem_mapeamento` aceite e estilize os três valores:
  - `PADRAO_API` — neutro (secondary)
  - `REGRA_API` — primário
  - `SUPABASE` — accent
- Atualizar `badges.tsx` se houver `OrigemMapeamentoBadge`.

### 4. Parâmetros de Recursos — modo leitura

Objetivo: deixar claro que é uma consulta temporária; nenhum POST/PUT/DELETE.

- `ParametrosRecursosTab.tsx`:
  - Remover botão "Novo", ações de editar e excluir, `handleDelete`, estados `dialogOpen`, `editing`, `deletingId`, import do dialog e do `parametrosRecursosCloud` (escrita).
  - Remover a coluna de ações.
  - Substituir o cabeçalho à direita por um aviso fixo: "Consulta — a parametrização definitiva ainda será definida. Edição desabilitada."
  - Continuar listando via `useParametrosRecursos` (que lê do Lovable Cloud).
- `ParametroRecursoDialog.tsx`: excluir o arquivo (não é mais usado).
- `parametrosRecursosCloud.ts`: manter apenas `listar()`; remover `criar`, `atualizar`, `excluir`.
- `useCargaProducao.ts`: nenhuma mudança (hook continua chamando `listar()`).

### 5. Limpezas

- Remover `useUserPermissions` e import de `toast` do tab de parâmetros (não há mais ações).
- Remover ícones não usados (`Plus`, `Pencil`, `Trash2`, `ShieldAlert`).

### Fora de escopo

- Nenhuma alteração no FastAPI.
- Nenhuma mudança em RLS ou em tabelas do Cloud (a tabela `producao_recurso_unidade` permanece, só não é mais escrita pelo frontend).
- Decisão de onde a parametrização "definitiva" vai morar (ERP, FastAPI próprio, Cloud) fica para uma próxima conversa.
