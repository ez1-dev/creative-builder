# Diagnóstico temporário no botão Atualizar da DRE

Adicionar 5 testes que rodam ao clicar **Atualizar** em `src/pages/bi/contabilidade/DrePage.tsx`, logam no console e mostram um resumo na tela. Não substitui a chamada principal à API `/api/bi/contabilidade/dre-matriz` — apenas roda em paralelo para diagnosticar.

## Mudanças em `DrePage.tsx`

### 1. Reintroduzir import do client do Cloud
```ts
import { supabase } from '@/integrations/supabase/client';
```

### 2. Novo estado de diagnóstico
```ts
type DiagItem = { label: string; qtd: number | null; error: string | null };
const [diag, setDiag] = useState<DiagItem[] | null>(null);
```

### 3. Função `rodarDiagnostico()` chamada dentro de `carregarDre()` (após o fetch da API)

Executa em paralelo (`Promise.all`) os 5 testes exatamente como descritos:

1. `bi_dre_estrutura` — `select codigo_linha, descricao, ativo limit 20`
2. `bi_vm_lanc_contabil` — `select anomes_referente, vl_realizado where anomes_referente='202606' limit 5`
3. `bi_vm_orc_dre` — `select anomes_referente, vl_orcado where anomes_referente='202606' limit 5`
4. RPC `bi_dre` com `{ p_anomes_ini: '202606', p_anomes_fim: '202606', p_unidade_negocio: null }`
5. RPC `bi_dre_matriz_anual` com `{ p_ano: '2026', p_unidade_negocio: null }`

Cada um loga `[DRE][DIAG] <nome>` com `{ error, qtd, data/dataPreview }` exatamente como no pedido. Depois popula `setDiag([...])` com `label`, `qtd`, `error` (mensagem) para renderização.

### 4. Painel de diagnóstico na UI
Logo abaixo do card de filtros, quando `diag` não for null, renderizar `<Card className="border-amber-400 bg-amber-50/40 dark:bg-amber-950/20">` com título "Diagnóstico temporário" e uma tabela compacta com as colunas **Teste**, **Qtd**, **Erro** para os 5 itens. Linhas com erro destacadas em `text-destructive`.

### 5. Manter intacto
- Chamada `fetch(/api/bi/contabilidade/dre-matriz)` continua sendo a fonte das `linhasRaw`.
- Filtros, KPIs, matriz, `useEffect([ano, unidade])` sem alteração.

## Fora do escopo
- Não mexer em RPC, ETL, schema.
- Não alterar layout definitivo. Painel é temporário, removível depois.
