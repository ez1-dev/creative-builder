## Problema

O dashboard `/frota` está mostrando apenas maio e junho porque a query no `ManutencaoFrotaPage.load()` usa `supabase.from('manutencao_frota').select('*')` sem paginação. O PostgREST/Supabase retorna no máximo **1000 linhas** por padrão.

Hoje existem **3.653 registros** na tabela (751 combustível + 246 manutenção + 2.656 pedágio). Como o `order('data', desc)` traz os mais recentes primeiro, apenas junho + maio cabem nas 1000 linhas — os meses anteriores são cortados. Isso não é bug de importação: os dados de dez/2025 a abr/2026 existem no banco.

## Correção

Em `src/pages/ManutencaoFrotaPage.tsx`, buscar todos os registros em páginas de 1000 usando `.range()` até esgotar, e só então setar `data`.

```ts
const load = async () => {
  setLoading(true);
  const PAGE = 1000;
  let from = 0;
  const acc: ManutencaoFrota[] = [];
  while (true) {
    const { data: rows, error } = await supabase
      .from('manutencao_frota')
      .select('*')
      .order('data', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) { toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' }); break; }
    if (!rows?.length) break;
    acc.push(...(rows as ManutencaoFrota[]));
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  setData(acc);
  setLoading(false);
};
```

Sem mudanças em UI, filtros, importação ou schema.
