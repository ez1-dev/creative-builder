## Objetivo
Garantir que a tela `/bi/contabilidade/dre` envie `p_unidade_negocio: null` para a RPC quando a unidade selecionada for "Todos" (independente de caixa/acento) e instrumentar logs decisivos para confirmar parâmetros e retorno.

## Alterações em `src/pages/bi/contabilidade/DrePage.tsx`

1. **Normalização robusta de unidade** dentro de `carregarDre()`:
   ```ts
   const unidadeNormalizada = String(unidade || '').trim().toUpperCase();
   const unidadeParam =
     !unidade ||
     unidadeNormalizada === 'TODOS' ||
     unidadeNormalizada === 'TODAS' ||
     unidadeNormalizada === 'ALL'
       ? null
       : unidade;
   const pAno = String(ano || '2026');
   ```

2. **Logs de diagnóstico** (substituir os atuais):
   - `[DRE] PARAMETROS ENVIADOS PARA RPC` com `ano, unidade, unidadeNormalizada, unidadeParam, p_ano, p_unidade_negocio`.
   - `[DRE] Supabase URL usada:` com `(supabase as any).supabaseUrl` para confirmar o ambiente.
   - `[DRE] RETORNO RPC bi_dre_matriz_anual` com `error, qtd, dataPreview`.
   - `[DRE] LINHAS QUE SERÃO SALVAS NO ESTADO` com `linhas.length`.

3. **Tratamento do retorno**:
   ```ts
   if (error) { setErro(...); setLinhasRaw([]); return; }
   const linhas = Array.isArray(data) ? data : [];
   setLinhasRaw(linhas);
   ```
   Sem `filter` ou descarte de linhas zeradas — a estrutura completa deve aparecer.

4. **Select de unidade**: confirmar que o item "Todos" usa `value="TODOS"` (já está correto no arquivo atual; manter).

## Fora do escopo
- Sem mudanças na RPC, em SQL, ou no ETL.
- Sem alteração na renderização da matriz, KPIs ou filtros de mês.
- Logs ficam até confirmação visual de `qtd > 0`; removidos em ticket seguinte.

## Validação
1. Abrir `/bi/contabilidade/dre` com filtro "Todos" / ano 2026.
2. Conferir no console:
   - `p_unidade_negocio: null`
   - `p_ano: "2026"`
   - `qtd: 18` (ou nº esperado)
   - URL Supabase corresponde ao projeto Cloud do app.
3. Tabela deve listar todas as linhas da estrutura DRE (mesmo zeradas).
