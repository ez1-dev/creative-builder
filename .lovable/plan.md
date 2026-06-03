## Diagnóstico

- O parser do frontend (`extrairPlaceholders` em `src/lib/etl/placeholders.ts`) já usa regex `\$\[([^\]]*)\]/g` e retorna **todos** os placeholders únicos do texto. Se a tela só mostra `$[ANOMES_INI]`, é porque o texto carregado no editor (`acao.sql_template` vindo do Cloud `cpgyhjqu...`) está desatualizado em relação ao `comando_sql` real, que está no Supabase novo (`razvdo...`) consumido pela FastAPI.
- Hoje o `EditarSqlModal` envia `parametros` com chaves em **minúsculas** (`anomes_ini`) e sempre embute o `sql_template` editado no body, ignorando o `comando_sql` salvo no backend.

## Mudanças

### 1. Backend FastAPI (fora deste repo — documentar)
Atualizar `docs/backend-etl-central.md` para deixar explícito:

- O endpoint `POST /api/etl/acoes/{acao_ref}/testar-sql` deve, **na ausência de `sql_template` no body**, ler `comando_sql` da tabela `public.etl_acoes` (Supabase novo) e usar esse texto como SQL a executar. Só cair em `sql_template` (legado) se `comando_sql` for NULL/vazio.
- Aceitar `parametros` com chaves em UPPERCASE (`ANOMES_INI`, `ANOMES_FIM`, …) e normalizar internamente antes de passar ao `resolver_placeholders` (que espera lowercase). Manter retrocompat com lowercase.
- Expor `GET /api/etl/acoes/{acao_ref}/comando-sql` retornando `{ comando_sql, versao, atualizado_em }` para o frontend pré-carregar o SQL real.

### 2. Frontend — `src/components/etl/EditarSqlModal.tsx`

- Ao abrir o modal, **antes** de cair no `acao.sql_template` do Cloud, tentar `GET /api/etl/acoes/{acaoRef}/comando-sql` (mesma resolução de `acaoRef` já implementada: `codigo_acao || id_acao || nome || id`). Se a chamada responder 200 e trouxer `comando_sql` não-vazio, usar esse texto como conteúdo inicial do editor (`sql`/`sqlExibido`). Em caso de erro/404, manter o fallback atual (`acao.sql_template`). Isso garante que o parser veja `ANOMES_INI` **e** `ANOMES_FIM`.
- No `executarTeste`, montar `parametros` com chaves em **UPPERCASE** (manter o nome original do placeholder, sem `.toLowerCase()`).
- Quando o usuário **não editou** o SQL (`sqlExibido === sqlOriginalCarregado`), **omitir** `sql_template` do body do `testarSqlAcao` para que o backend use o `comando_sql` salvo. Quando editou, continuar enviando `sql_template` (preview do rascunho).

### 3. Frontend — `src/lib/etl/api.ts`

- Adicionar `buscarComandoSql(acaoRef: string | number): Promise<{ comando_sql: string | null; versao?: number; atualizado_em?: string } | null>` que chama `GET /api/etl/acoes/.../comando-sql` com o mesmo header `ngrok-skip-browser-warning`. Retorna `null` em 404 para o modal aplicar fallback.
- Tornar `sql_template` opcional em `TestarSqlBody` (já é) e garantir que `parametros` tipa `Record<string, string | number>` sem forçar casing.

## Critérios de aceite

- Abrindo Editar SQL de `VM_FATURAMENTO`, o editor mostra o `comando_sql` real e a seção Testar SQL renderiza inputs para `$[ANOMES_INI]` **e** `$[ANOMES_FIM]`.
- Sem editar o SQL e clicando em Executar preview, o body POST é exatamente:
  ```json
  { "parametros": { "ANOMES_INI": "202605", "ANOMES_FIM": "202605" }, "limite": 100 }
  ```
  (sem `sql_template`).
- Se o usuário editar o SQL, o body volta a incluir `sql_template` com o rascunho.
- Nenhuma alteração no schema do Cloud; apenas leitura/escrita de docs e ajuste do modal/api.

## Fora de escopo

- Implementação Python da FastAPI e do Supabase `razvdo...` (apenas documentado).
- `src/integrations/supabase/{client,types}.ts` e `.env`.