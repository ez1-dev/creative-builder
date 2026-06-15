## Diagnóstico

Banco confirmado: `postgres` / schema `public` (mesmo Lovable Cloud do projeto). Encontrei **duas causas reais** e uma incompatibilidade adicional:

### 1. Assinatura da função não bate com a chamada do frontend
A função existente é:
```
public.bi_dre_matriz_anual(p_ano integer, p_unidade_negocio text)
```
Mas o frontend chama com `p_ano: String(ano || '2026')` (texto).
PostgREST procura overload `(text, text)` → não encontra → erro **"function not found in schema cache"**.

Não existem `bi_dre` nem `bi_dre_matriz_anual_v2` no schema `public`.

### 2. Bug interno: referência ambígua a `descricao`
A função tem `OUT descricao text` (variável PL/pgSQL) e dentro da CTE `base` usa `descricao` sem qualificar:
```
WHERE upper(unaccent(descricao)) LIKE 'RECEITA LIQUIDA%'
```
Postgres lança `column reference "descricao" is ambiguous`. Mesmo se a assinatura batesse, a execução falharia.

### 3. Nomes de coluna divergem do que o frontend espera
A função retorna `mascara`, `total_realizado/av/orc(ado)`. O frontend usa:
- `row.codigo_linha` (não existe — função só tem `mascara`)
- `row.total_orcado` (a função retorna `total_orc`)

Isso quebra o `findByCodigo` (KPIs Receita Bruta / Lucro Bruto / EBITDA / Lucro Líquido) e a coluna TOTAL.

## Correção (migration)

Recriar `public.bi_dre_matriz_anual` com:

1. **Assinatura `(p_ano text, p_unidade_negocio text)`** — converte internamente com `p_ano::int`. Mantém compatibilidade total com a chamada atual do frontend (`String(ano)`).
2. **Renomear OUT `descricao` → `out_descricao`** (ou qualificar `m.descricao` na CTE `base`). Vou qualificar `meses.descricao` para minimizar mudança.
3. **Adicionar coluna `codigo_linha`** ao retorno — usar `bi_dre_estrutura.codigo_linha` se existir; caso contrário, derivar de `mascara` (vou verificar a coluna disponível na migration via `information_schema`).
4. **Renomear `total_orc` → `total_orcado`** no retorno, para casar com o frontend.

Estrutura final do RETURNS TABLE:
```
ordem int, codigo_linha text, descricao text, mascara text, totalizadora bool, nivel int,
jan_realizado, jan_av, jan_orcado, ..., dez_realizado, dez_av, dez_orcado,
total_realizado, total_av, total_orcado
```

GRANT EXECUTE para `authenticated` e `anon` mantido.

## Cache-bust do preview
Após a migration, o PostgREST recarrega o schema cache automaticamente (~10s). Vou disparar `NOTIFY pgrst, 'reload schema'` e reiniciar o dev server do preview Lovable para garantir.

## Não tocar
- `DrePage.tsx` — a chamada RPC está correta como o usuário pediu.
- Outras funções DRE — só `bi_dre_matriz_anual` precisa de ajuste.

## Passos
1. Migration: `CREATE OR REPLACE FUNCTION public.bi_dre_matriz_anual(text, text)` com os 4 ajustes acima + `DROP` da versão `(integer, text)` para não causar ambiguidade.
2. `NOTIFY pgrst, 'reload schema'`.
3. Reiniciar dev server.
4. Validar: rodar `SELECT * FROM bi_dre_matriz_anual('2026', NULL) LIMIT 5` e abrir `/bi/contabilidade/dre` no preview.
