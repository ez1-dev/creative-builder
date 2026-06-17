## Fix PGRST203 — RPC `bi_dre_drill_realizado` com duas assinaturas

A RPC `public.bi_dre_drill_realizado` vive no Postgres do backend FastAPI (não no Lovable Cloud — `psql` no Cloud confirma que não existe lá). Por isso o `DROP FUNCTION` deve rodar lá, não como migration do Cloud. A correção tem duas pontas:

### 1. Backend (spec em `docs/backend-bi-contabilidade-dre-drill.md`)

Adicionar bloco "Correção PGRST203" no topo do documento e ajustar a seção da RPC para deixar **uma única assinatura** com 6 parâmetros (todos `text`, na ordem fixada pelo usuário):

```sql
-- 1) Remover a versão antiga (5 parâmetros) que causa PGRST203
DROP FUNCTION IF EXISTS public.bi_dre_drill_realizado(text, text, text, text, text);

-- 2) (Re)criar somente esta assinatura
CREATE OR REPLACE FUNCTION public.bi_dre_drill_realizado(
  p_anomes_ini       text,
  p_anomes_fim       text,
  p_codigo_linha     text,
  p_tipo_drill       text,
  p_anomes_referente text,
  p_unidade_negocio  text
) RETURNS TABLE (...) AS $$ ... $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3) Forçar PostgREST a recarregar o cache de schema
NOTIFY pgrst, 'reload schema';
```

Regras:
- Sempre passar os 6 parâmetros do endpoint FastAPI; `p_anomes_referente` e `p_unidade_negocio` podem chegar como `NULL` (a função trata).
- Não criar overloads em hipótese alguma — qualquer mudança futura deve `CREATE OR REPLACE` mantendo a mesma assinatura, ou seguir o ciclo `DROP` + recriar.

### 2. Frontend (`src/lib/bi/dreDrillApi.ts`)

Hoje o `fetchDreDrill` só envia `unidade` e `anomes_referente` quando têm valor. Trocar para enviar **sempre** os 6 parâmetros (string vazia vira `null` no backend, que já é o contrato):

```ts
const qs = new URLSearchParams({
  ano: String(params.ano),
  mes_ini: params.mes_ini,
  mes_fim: params.mes_fim,
  codigo_linha: params.codigo_linha,
  tipo_drill: params.tipo_drill,
  anomes_referente: params.anomes_referente ? String(params.anomes_referente) : '',
  unidade: params.unidade && params.unidade.toUpperCase() !== 'TODOS' ? params.unidade : '',
});
```

Backend FastAPI deve converter `''` → `None` antes de chamar a RPC, garantindo que sempre invoque a assinatura de 6 parâmetros (evitando o overload).

### 3. Não fazer

- Não criar migração no Lovable Cloud — a RPC não está lá.
- Não tocar em `bi_dre_realizado_regras`, `bi_dre_estrutura`, `bi_dre_mascara`.
- Não alterar a forma de montar a query string para outros endpoints.

### Arquivos

Editar: `docs/backend-bi-contabilidade-dre-drill.md`, `src/lib/bi/dreDrillApi.ts`.
