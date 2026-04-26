# KPI Colaboradores: total do catálogo

## Mudança em `src/components/passagens/PassagensDashboard.tsx`

1. Adicionar import `useEffect` e `supabase` no topo.
2. Criar estado `catalogoCount` que carrega via `supabase.from('colaboradores_catalogo').select('*', { count: 'exact', head: true }).eq('ativo', true)` no mount.
3. Substituir o cálculo `colaboradoresUnicos` (linha 81) — passa a usar `catalogoCount`.
4. Trocar o título do KPI de "Colaboradores" para **"Colaboradores (catálogo)"** para deixar explícito que é o tamanho do quadro, não quem teve gastos.

Resultado: card mostrará **152** (total de nomes ativos no catálogo). Conforme novos colaboradores forem cadastrados via combobox, o número sobe automaticamente.
