## Problema
Ao abrir uma página do RH (ex.: `/rh/turnover`), os cards aparecem primeiro com o **tamanho padrão** definido em `*_DEFAULTS` e, uma fração de segundo depois, "pulam" para o tamanho salvo pelo usuário. Isso causa um flash visível de re-layout.

## Causa raiz
`useRhModuleLayout` inicializa o estado com os defaults:

```ts
const [widgets, setWidgets] = useState<RhWidget[]>(defaults);
```

A página renderiza imediatamente `RhDashboardGrid` com esses widgets. Só depois do `load()` async (auth + `dashboards` + `dashboard_widgets`) o hook faz `setWidgets(mergeWithDefaults(...))` com o layout salvo. Resultado: primeiro paint com defaults → segundo paint com o layout do banco = "salto".

O hook já expõe `loading`, mas nenhuma página RH está usando esse flag para gatear a renderização do grid — todas montam `RhDashboardGrid` na hora.

## Correção

1. **`src/hooks/useRhModuleLayout.ts`**
   - Adicionar `layoutReady` (boolean) que só vira `true` depois do primeiro `load()` terminar (sucesso ou falha). `loading` continua controlando o spinner, `layoutReady` controla o "posso pintar o grid".
   - Não alterar comportamento de saves/optimistic — apenas evitar o primeiro paint com defaults quando ainda não sabemos o que o usuário salvou.

2. **`src/components/rh/RhDashboardGrid.tsx`**
   - Aceitar props opcionais `loading?: boolean` e `skeletonHeight?: number` (default ~600px).
   - Quando `loading===true`, renderizar um placeholder simples (div com altura reservada + `Skeleton`), sem montar o `PassagensLayoutGrid`. Isso reserva o espaço vertical (evita CLS na página) e não instancia os Recharts até termos o layout definitivo.

3. **Páginas RH que usam o grid** — passar o novo flag:
   - `src/pages/rh/TurnoverPage.tsx`
   - `src/pages/rh/ResumoFolhaPage.tsx`
   - `src/pages/rh/QuadroColaboradoresPage.tsx`
   - `src/pages/rh/ContratosPage.tsx`
   - `src/pages/rh/ProgramacaoFeriasPage.tsx`
   - `src/pages/rh/AbsenteismoPage.tsx`

   Mudança em cada uma: `<RhDashboardGrid ... loading={!layout.layoutReady} />`.

Nenhum outro arquivo é tocado. Sem mudanças em backend, schema, edge functions, ou no fluxo de saves já implementado.

## Validação
- Recarregar `/rh/turnover` (e demais páginas RH) com layout customizado salvo: os cards aparecem **já** no tamanho salvo, sem flash de tamanho padrão.
- Primeiro acesso (sem layout salvo): mostra skeleton por ~1 frame e depois pinta os defaults — sem "pulo" visível.
- Editar/mover/redimensionar continua funcionando igual (o comportamento otimista do save não é alterado).
