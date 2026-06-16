# Plano — Corrigir renderização da DRE

Refatorar `src/pages/bi/contabilidade/DrePage.tsx` para garantir carga automática, tratamento de erro visível e mensagens corretas de estado vazio.

## Mudanças em `src/pages/bi/contabilidade/DrePage.tsx`

### 1. Estado

Adicionar dois estados novos junto aos existentes:

- `const [erro, setErro] = useState<string | null>(null);`
- `const [buscou, setBuscou] = useState(false);`

Renomear `linhasRaw`/`setLinhasRaw` mantendo a semântica, mas o fluxo passa a usar `rows` como conceito (apelido — pode manter o nome interno `linhasRaw`, o importante é o comportamento).

### 2. Função `carregarDre` (renomear `fetchDre` → `carregarDre`)

```ts
async function carregarDre() {
  setLoading(true);
  setErro(null);
  setBuscou(true);

  console.log('[DRE] Chamando RPC bi_dre_matriz_anual', {
    ano, unidade,
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
    setErro(error.message || JSON.stringify(error));
    setLinhasRaw([]);
  } else {
    setLinhasRaw((data as DreLinha[]) || []);
  }
  setLoading(false);
}
```

Remover o `try/catch` com `toast.error` (erro agora aparece em destaque na tela; mantém `console.error`).

### 3. `useEffect`

Manter o efeito que dispara em `[ano, unidade]` chamando `carregarDre()` — atende tanto carga inicial quanto troca de filtros.

### 4. Botão Atualizar

```tsx
<Button size="sm" className="h-8 w-full" onClick={carregarDre} disabled={loading}>
  <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} />
  {loading ? 'Atualizando...' : 'Atualizar'}
</Button>
```

### 5. Renderização condicional do corpo da tabela

Substituir o `<tr>` único de fallback por lógica em três níveis dentro do `<tbody>`:

- `loading` → linha "Carregando DRE..."
- `erro` (não loading) → linha destacada em vermelho com a mensagem (`text-destructive`, fundo `bg-destructive/10`)
- `!loading && buscou && linhas.length === 0` → "Nenhum dado encontrado para os filtros selecionados."
- `!loading && !buscou` → não renderiza nada (carga já dispara no mount, então praticamente nunca aparece)
- `linhas.length > 0` → renderiza as linhas como hoje

Remover a string fixa "Selecione o ano e clique em Atualizar.".

### 6. KPIs superiores

Manter o uso atual via `findByCodigo(linhas, 'RECEITA_BRUTA' | 'LUCRO_BRUTO' | 'EBITDA' | 'RESULTADO_EXERCICIO')` pegando `total_realizado` — já é o comportamento equivalente ao `rows.find(...)` solicitado. Garantir fallback `?? 0` ao passar para os cards.

### 7. Logs temporários

Mantidos exatamente como acima — serão removidos numa próxima rodada após confirmação.

## Fora do escopo

- Nenhum outro arquivo é alterado.
- Sem migrations (RPC já validada).
- Sem mudança no contrato da RPC (`p_ano: text`, `p_unidade_negocio: text|null`).
