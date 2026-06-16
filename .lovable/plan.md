# Diagnóstico temporário — DRE (RPC vs API antiga)

Objetivo: descobrir por que a RPC `bi_dre_matriz_anual` retorna vazio no front, comparando com a API antiga `/api/bi/contabilidade/dre` que sabidamente funciona.

## Mudanças em `src/pages/bi/contabilidade/DrePage.tsx`

### 1. Novo estado para diagnóstico
Adicionar:
```ts
const [diag, setDiag] = useState<{
  unidadeParam: string | null;
  qtdRpc: number | null;
  erroRpc: string | null;
  qtdApi: number | null;
  erroApi: string | null;
} | null>(null);
```

### 2. Refatorar `carregarDre()`
Manter a normalização atual de `unidadeParam` / `pAno`. Adicionar logs e chamada paralela à API antiga:

- Log `[DRE][RPC] Parâmetros` com `{ ano, unidade, unidadeNormalizada, unidadeParam, p_ano, p_unidade_negocio }`.
- Executar `supabase.rpc('bi_dre_matriz_anual', { p_ano, p_unidade_negocio: unidadeParam })` e logar `[DRE][RPC] Resultado` com `{ error, qtd, dataPreview }`.
- Em seguida, chamada de diagnóstico à API antiga:
  ```ts
  const apiUrl = `/api/bi/contabilidade/dre?anomes_ini=202606&anomes_fim=202606&unidade=${unidadeParam || ''}`;
  const apiResponse = await fetch(apiUrl);
  const apiJson = await apiResponse.json().catch(() => null);
  ```
  Logar `[DRE][API ANTIGA] Resultado` com `{ status, ok, qtd, dataPreview }`. Envolto em try/catch para não quebrar a tela se a rota não estiver acessível pelo preview.
- Popular `setDiag({...})` com `unidadeParam`, `qtdRpc`, `erroRpc`, `qtdApi`, `erroApi`.
- Continuar populando `linhasRaw` a partir do retorno da RPC (comportamento atual preservado).

### 3. Painel de diagnóstico na UI
Logo abaixo do `<Card>` de filtros, renderizar um pequeno card amarelo (`border-amber-400 bg-amber-50/40 dark:bg-amber-950/20`) marcado como “Diagnóstico temporário” quando `diag` não for null, exibindo em formato chave/valor:

- `unidadeParam`
- `qtdRpc`
- `erroRpc`
- `qtdApi`
- `erroApi`

Sem alterar layout definitivo, KPIs, tabela DRE, filtros ou contratos da RPC.

## Fora do escopo
- Não alterar a RPC, ETL, SQL ou backend.
- Não alterar a renderização da matriz, KPIs ou filtros de mês.
- Diagnóstico será removido depois que confirmarmos a causa.
