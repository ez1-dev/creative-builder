## Objetivo

Corrigir as duas quebras visuais detectadas no viewport tablet (~768–1023px) da página pública `/passagens-aereas/compartilhado`:

1. **KPI "Registros"**: o `Select` "Centro de Custo / UF" + ícone de avião se sobrepõem ao número do card.
2. **Tabela Registros**: a tabela desktop com 7 colunas estoura horizontalmente (Origem→Destino e Valor saem do viewport).

## Estratégia

Introduzir um threshold local **`isCompact` = `< 1024px`** dentro do `PassagensDashboard` (sem alterar `useIsMobile` global) e usá-lo apenas nos pontos onde o layout desktop não cabe em tablet:

- Render do **KPI "Registros"** → versão empilhada (Select abaixo do número), idêntica à já usada no mobile.
- Render da **lista Registros** → cards verticais (`PassagemMobileCard`), também já existentes.

Isso reaproveita os layouts mobile já testados e elimina ambas as sobreposições/cortes em uma só correção.

Adicionalmente, o grid dos 4 KPIs sobe de `md:grid-cols-4` para `lg:grid-cols-4`, ficando **2×2 em tablet** com folga, e 4 colunas só em desktop (≥1024px).

## Mudanças em `src/components/passagens/PassagensDashboard.tsx`

### 1. Adicionar threshold `isCompact` (após `useIsMobile`, ~linha 88)
```tsx
const [isCompact, setIsCompact] = useState<boolean>(() =>
  typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
);
useEffect(() => {
  const mql = window.matchMedia('(max-width: 1023px)');
  const onChange = () => setIsCompact(window.innerWidth < 1024);
  mql.addEventListener('change', onChange);
  onChange();
  return () => mql.removeEventListener('change', onChange);
}, []);
```

### 2. Grid dos 4 KPIs (linha 560)
```diff
- <div className="grid grid-cols-1 gap-3 md:grid-cols-4 items-stretch">
+ <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
```

### 3. KPI "Registros" — usar `isCompact` em vez de `isMobile` (linha 562)
Trocar a condição que decide entre versão empilhada e versão com Select absolute:
```diff
- {isMobile ? (
+ {isCompact ? (
```
A versão empilhada já existente (linhas 563-596) passa a ser usada em mobile e tablet.

### 4. Lista Registros — cards verticais até 1024px (linha 826)
```diff
- <CardContent className={cn(isMobile ? 'p-3' : 'overflow-x-auto p-0')}>
-   {isMobile ? (
+ <CardContent className={cn(isCompact ? 'p-3' : 'overflow-x-auto p-0')}>
+   {isCompact ? (
```
Tablet passa a ver cards verticais (`PassagemMobileCard`) em vez da tabela cortada.

### 5. Mantém `isMobile` (sem mudar) para
- Altura/margem do chart pizza (linhas 677-695).
- Top 10 vs Top 15 Centros de Custo (linhas 741-751).
- Truncamento de labels do BarChart vertical.
- Render do gráfico (`isMobile && porMotivo.length > 0` legenda inline).

Esses ajustes seguem fazendo sentido sob o breakpoint mobile real (<768px).

## Comportamento esperado pós-correção

| Viewport | KPIs | Tabela Registros |
|---|---|---|
| 375 (mobile) | 1 coluna empilhada | Cards verticais |
| 768 (tablet) | 2×2 com folga, sem sobreposição | Cards verticais (sem corte horizontal) |
| 1280 (desktop) | 4 colunas lado a lado | Tabela completa com todas as colunas |

Subtotal sticky e cross-filters continuam funcionando em todos os tamanhos.

## Arquivo afetado
- `src/components/passagens/PassagensDashboard.tsx`
