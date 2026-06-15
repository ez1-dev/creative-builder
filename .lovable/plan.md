## Objetivo
Adicionar dois novos filtros (Mês inicial e Mês final) na página `/bi/contabilidade/dre`, mantendo a RPC `bi_dre_matriz_anual` intacta. O recorte de meses é aplicado apenas na renderização das colunas.

## Alterações em `src/pages/bi/contabilidade/DrePage.tsx`

### 1. Constante `MESES`
Enriquecer com o campo `numero` ('01'..'12') para comparação textual:

```ts
const MESES = [
  { key: 'jan', numero: '01', label: 'Janeiro' },
  { key: 'fev', numero: '02', label: 'Fevereiro' },
  ...
  { key: 'dez', numero: '12', label: 'Dezembro' },
];
```

### 2. Novo state
```ts
const [mesInicial, setMesInicial] = useState<string>('01');
const [mesFinal,   setMesFinal]   = useState<string>('12');
```
Default: `'01'` / `'12'`. Não disparam refetch (RPC sempre retorna ano completo).

### 3. Validação automática
Handler do mês inicial: se `novoInicio > mesFinal`, ajusta `setMesFinal(novoInicio)` e exibe `toast.info('Mês final ajustado para …')`. Análogo no mês final (não permitir menor que mesInicial — ajusta para igual).

### 4. UI — grid de filtros
Trocar o grid atual (Ano | Unidade | Atualizar) por 5 colunas em desktop:
```
[Ano] [Mês inicial] [Mês final] [Unidade] [Atualizar]
```
Mês inicial/final como `<Select>` shadcn com itens "01 - Janeiro" … "12 - Dezembro" usando `MESES`.
Grid: `grid-cols-2 md:grid-cols-5 gap-3 items-end`.

### 5. Filtragem de colunas
Substituir a montagem de `colunas`:
```ts
const mesesVisiveis = MESES.filter(m => m.numero >= mesInicial && m.numero <= mesFinal);
const colunas = [...mesesVisiveis, { key: 'total', numero: '', label: 'TOTAL', isTotal: true }];
```
A coluna TOTAL permanece sempre no final, lendo `total_realizado / total_av / total_orcado` da RPC (não recalcular).

### 6. Inalterado
- Chamada RPC: `supabase.rpc('bi_dre_matriz_anual', { p_ano: String(ano||2026), p_unidade_negocio: unidade==='TODOS'?null:unidade })` — sem `.select()` / `.order()`.
- KPIs (Receita Bruta, Lucro Bruto, EBITDA, Lucro Líquido) continuam usando `total_*`.
- Sticky da primeira coluna "Máscara", cabeçalho fixo, scroll horizontal, formatação BRL/percentual, negativos em vermelho.
- `useEffect([ano, unidade])` refetch — mesInicial/mesFinal NÃO entram nas deps.

## Resultado esperado
Usuário seleciona, ex.: Ano 2026, Mês inicial 06, Mês final 12 → tabela exibe colunas Jun..Dez + TOTAL (com TOTAL ainda do ano inteiro, vindo da RPC).