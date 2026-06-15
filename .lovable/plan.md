## Objetivo

Diagnosticar por que não aparece chamada para `bi_dre_matriz_anual` na aba Network — adicionar logs antes/depois da RPC em `DrePage.tsx`.

## Mudanças

**Arquivo:** `src/pages/bi/contabilidade/DrePage.tsx`

Dentro de `fetchDre()`, envolver a chamada com dois `console.log`:

```ts
const fetchDre = async () => {
  setLoading(true);
  try {
    console.log('[DRE] Chamando RPC bi_dre_matriz_anual', {
      ano,
      unidade,
      p_ano: String(ano || '2026'),
      p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
    });
    const { data, error } = await supabase.rpc('bi_dre_matriz_anual' as any, {
      p_ano: String(ano || '2026'),
      p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
    });
    console.log('[DRE] Retorno RPC bi_dre_matriz_anual', {
      error,
      qtd: (data as any[] | null)?.length,
      dataPreview: (data as any[] | null)?.slice?.(0, 3),
    });
    if (error) {
      console.error('Erro RPC bi_dre_matriz_anual:', error);
      throw error;
    }
    setLinhasRaw((data as DreLinha[]) ?? []);
  } catch (err: any) {
    toast.error(err?.message || 'Falha ao carregar DRE');
    setLinhasRaw([]);
  } finally {
    setLoading(false);
  }
};
```

Nenhuma outra alteração. Logs são temporários — removidos após o diagnóstico.

## Como interpretar

- Console sem `[DRE] Chamando...` → componente/effect não está executando (rota ou guard).
- `[DRE] Chamando...` sem request em `/rest/v1/rpc/bi_dre_matriz_anual` no Network → cliente Supabase bloqueado/erro síncrono.
- Request presente com erro → copiar response para próxima iteração.
- Retorno com dados → problema está no render/outra consulta.
