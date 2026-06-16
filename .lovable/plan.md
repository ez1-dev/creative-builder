# DRE Matriz — consumir API do backend em vez de RPC direta

## Contexto
Hoje `src/pages/bi/contabilidade/DrePage.tsx` chama `supabase.rpc('bi_dre_matriz_anual', ...)` direto do front. A RPC retorna dados no SQL Editor, mas não no preview. A tela antiga `/api/bi/contabilidade/dre` (FastAPI) funciona normalmente. Vamos seguir o mesmo padrão: o front consome a API; o backend chama a RPC.

## Backend (FastAPI — fora do repositório Lovable)
Criar endpoint:

```
GET /api/bi/contabilidade/dre-matriz?ano=2026&unidade=
```

Comportamento:
- `ano` (str, obrigatório, ex.: `2026`).
- `unidade` (str, opcional). Vazio / ausente / `TODOS` / `TODAS` / `ALL` → enviar `NULL` para a RPC.
- Internamente executar `SELECT * FROM public.bi_dre_matriz_anual(p_ano := %s, p_unidade_negocio := %s)`.
- Retornar JSON: array de linhas exatamente como a RPC devolve (mesmos campos `ordem`, `codigo_linha`, `descricao`, `total_realizado`, `total_av`, `total_orcado`, `jan_realizado`, `jan_av`, `jan_orcado`, … `dez_*`).
- CORS liberado para o preview Lovable; resposta sem necessidade do header `ngrok-skip-browser-warning` (mas o front já envia).

Documentar em `docs/backend-bi-contabilidade-dre-matriz.md` (novo): contrato, exemplo de request/response, regra do `unidade` vazio = `NULL`.

## Frontend (`src/pages/bi/contabilidade/DrePage.tsx`)

1. Substituir a chamada `supabase.rpc('bi_dre_matriz_anual', ...)` por `fetch` à API:
   ```ts
   const url = `${getApiUrl()}/api/bi/contabilidade/dre-matriz?ano=${pAno}&unidade=${unidadeParam || ''}`;
   const resp = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
   const json = await resp.json();
   const linhas: DreLinha[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
   setLinhasRaw(linhas);
   ```
2. Tratamento de erro: `!resp.ok` → `setErro(`HTTP ${resp.status}`)` e `setLinhasRaw([])`. Try/catch para falha de rede.
3. Remover o import `supabase` se ficar sem uso (verificar).
4. Remover o bloco de diagnóstico temporário (card amarelo + estado `diag` + logs `[DRE][RPC]` / `[DRE][API ANTIGA]`), já que a nova chamada substitui a investigação.
5. Manter intactos:
   - Filtros Ano, Mês inicial, Mês final, Unidade (mês continua apenas controlando colunas exibidas via `colunas`).
   - `useEffect([ano, unidade])` continua disparando `carregarDre`.
   - KPIs, totalizadoras, renderização da matriz, `PageDataProvider`, `UserWidgetsSlot`.

## Fora do escopo
- Não mexer na RPC, ETL, SQL, schema.
- Não alterar a tela antiga `/api/bi/contabilidade/dre`.
- Não mudar layout, KPIs ou cálculos.
