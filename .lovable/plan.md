## Diagnóstico

A consulta direta ao banco mostra que `dashboard_widgets` **foi atualizado às 16:12 de hoje** com `hidden=true` em `chart-top-uf` e layouts não-default — ou seja, o save funcionou em pelo menos uma rodada. Mas ainda há sintomas de "ao recarregar volta ao anterior".

Causas prováveis (pelo código atual):

1. **`localLayout` sobrescreve `w.layout` mesmo fora de edição.**
   `PassagensLayoutGrid.tsx` linha 65: `const cur = localLayout[w.type] ?? w.layout`. O estado `localLayout` é populado durante a edição e **só é limpo quando o conjunto de tipos muda** (`widgetTypesKey`). Após Save, `await load()` refaz `widgets`, mas como o conjunto de tipos é o mesmo, `localLayout` permanece com valores antigos da sessão de edição. Se houver qualquer divergência entre o que foi enviado e o que voltou do banco (ex.: redimensionamento bloqueado por minW/minH, normalização do react-grid-layout, ou um item que não estava em `pendingLayout`), o display continua mostrando o "antigo" da memória até o user dar F5.

2. **`pendingLayout` só inclui blocos visíveis.**
   `orderedWidgets` filtra `w.hidden`. Quando o usuário **só** oculta um bloco e clica Save sem arrastar nada, `pendingLayout` pode estar `null` (ou conter só o conjunto pré-hide). Save então usa `effectiveWidgets.map(w.layout)` como fallback. Para o bloco oculto isso funciona. Mas se o user move um bloco e DEPOIS oculta outro, o emit final pode não conter o oculto → fallback usa `effectiveWidgets.find().layout` que ainda é o original do banco. OK em teoria, mas frágil.

3. **Save pode estar lançando erro silenciosamente em algum item.**
   `saveLayout` faz update por linha; se uma linha retornar 0 (RLS) ele acumula em `errors[]` e dispara `toast.error`. Mas se o usuário fechar a edição rápido, talvez não veja. E se um único item falhar, os outros que sucederam ficam salvos parcialmente — confundindo o que "voltou ao anterior".

## Correções

### 1. Sincronizar `localLayout` com `widgets` quando sair do modo edição
Em `PassagensLayoutGrid.tsx`, adicionar um `useEffect` que **reseta `localLayout` para os valores de `w.layout`** sempre que `editing` mudar de `true` → `false`. Isso garante que após Save o display reflita exatamente o que voltou do banco.

```ts
const prevEditing = useRef(editing);
useEffect(() => {
  if (prevEditing.current && !editing) {
    // Sair do modo edição: reset com os layouts atuais dos widgets (vindos do load())
    const fresh: Record<string, ...> = {};
    orderedWidgets.forEach((w) => {
      fresh[w.type] = { x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h };
    });
    setLocalLayout(fresh);
  }
  prevEditing.current = editing;
}, [editing, orderedWidgets]);
```

### 2. Garantir que `pendingLayout` cubra todos os tipos visíveis no momento do Save
No botão Save de `PassagensDashboard.tsx` (linha 911), construir `baseLayout` a partir de **`effectiveWidgets`** (todos os tipos, incluindo ocultos), aplicando overrides de `pendingLayout` por cima:

```ts
const overrides = new Map((pendingLayout ?? []).map(b => [b.type, b.layout]));
const baseLayout = effectiveWidgets.map(w => ({
  type: w.type,
  layout: overrides.get(w.type) ?? w.layout,
}));
```

Isso elimina a dependência do filtro de visíveis e garante que **todo** widget seja persistido com layout coerente.

### 3. Diagnóstico no Save (temporário, mas útil)
Em `usePassagensLayout.ts`, antes do `update`, logar payload + após o update logar `updated.length` para cada tipo. Em `PassagensDashboard.tsx`, no `catch` mostrar `error.message` no toast (já mostra) e console.error com stack. Mantém essa instrumentação até confirmarmos.

### 4. Toast distinto para sucesso parcial
Em `saveLayout`, se `errors.length > 0` mas algum bloco salvou, lançar mensagem que indique "Salvos N de M, falha em X". Hoje só salva tudo ou nada (lança).

## Arquivos afetados
- `src/components/passagens/PassagensLayoutGrid.tsx` — useEffect de reset ao sair de edição.
- `src/components/passagens/PassagensDashboard.tsx` — construção de `baseLayout` cobrindo todos `effectiveWidgets`; logs no `catch`.
- `src/hooks/usePassagensLayout.ts` — `console.debug` por item no save.

## Validação
1. Em `/passagens-aereas` modo edição:
   - Mover bloco A → Save → verificar no console que payload contém A com nova layout e que update retornou 1 linha.
   - Recarregar (F5) → bloco A continua na nova posição.
2. Ocultar bloco B sem arrastar nada → Save → reload → bloco B continua oculto e disponível em "Adicionar".
3. Sequência: mover A, redimensionar C, ocultar B → Save → reload → todos persistem.
4. Sem regressão em adicionar/configurar gráfico.

## Fora de escopo
- Refator do react-grid-layout / migração para outro lib.
- Mudança de RLS (admin já passa).