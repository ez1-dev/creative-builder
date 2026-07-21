## Objetivo
Fazer a coluna **Usuário Origem** aparecer no drill (Razão) da DRE/Balanço mesmo quando o backend devolve `usuario_origem = null`.

## Diagnóstico (verificado)
Chamando `GET /api/contabil/drill-lancamentos?codemp=1&ctared=2160&anomes=202601`, cada item vem com três campos de usuário:

- `usuario_origem` — hoje quase sempre `null` (só preenchido quando há divergência real de lote)
- `usuario` — usuário do módulo de origem (ex.: `"agendador"` para VEN, o operador do faturamento etc.)
- `usuario_lancamento` — quem efetivou o lançamento contábil

O `DrillDrawer` renderiza apenas `r.usuario_origem`, então a coluna fica vazia em praticamente todos os lançamentos originados de subsistemas.

## Mudança proposta
Em `src/components/dre-studio/DrillDrawer.tsx`, tratar a coluna **Usuário Origem** com fallback:

```
usuarioOrigemDisplay = r.usuario_origem ?? r.usuario ?? ""
```

Aplicar em três pontos:

1. Célula da grid (linhas ~588-603) — mostrar `usuarioOrigemDisplay`. Manter o realce âmbar + tooltip apenas quando `usuario_origem_difere === true` (comportamento atual).
2. Modal de detalhe (linha ~754) — `Info label="Usuário origem"` usa o mesmo fallback.
3. Export Excel (linha ~304) — coluna "Usuário Origem" grava `usuarioOrigemDisplay` em vez de `r.usuario_origem ?? ""`.

O tooltip de divergência continua citando `r.usuario_origem` cru (para deixar claro qual é o campo canônico do backend), e a coluna **Usuário Lcto.** permanece intocada.

## Fora de escopo
- Nenhuma mudança no backend, no endpoint ou nos filtros do drill.
- Nenhuma alteração de estilo/layout além da célula.
