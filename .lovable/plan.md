## Diagnóstico

O drawer do card **Líquido** abre com o cabeçalho certo (`total_liquido`, valor R$ 1.277.658,43) mas o corpo fica só uma barra cinza:

- Não há requisição para `GET /api/rh/resumo-folha/drill` (rede vazia).
- No `ResumoFolhaDrillDrawer.tsx`, o `useQuery` está com `enabled: open && !!drillItem && !!tab`. Se `tab` fica `""` a consulta nunca dispara.
- O `tab` inicial vem de `agrupamentos[0]?.key ?? ""`, onde `agrupamentos = drillItem?.agrupamentos ?? []`.
- Conclusão mais provável: o item `total_liquido` chega no `drills_menu` **sem `agrupamentos`** (ou com array vazio). Nesse caso o ramo `agrupamentos.length === 0` deveria mostrar "Este card não expõe agrupamentos de drill…", mas a barra cinza observada indica que a mensagem some porque o `SheetContent` está com `overflow-y-auto` e o layout do header empurra a área de conteúdo (não há `mt-*` no ramo do else; o texto renderiza fora do viewport visível do usuário).

Como não há endpoint de referência para conferir o payload atual sem tocar no backend, o plano é robustecer o front para: (a) sempre mostrar um estado explícito, (b) tentar um fallback de agrupamentos padrão para o card `total_liquido` (mesmos aceitos pelos outros cards de valor), (c) logar o `drillItem` no console para o próximo diagnóstico.

## Escopo (somente front)

`src/components/rh/ResumoFolhaDrillDrawer.tsx`

1. **Fallback de agrupamentos** — quando `drillItem.agrupamentos` estiver vazio, usar `DEFAULT_AGRUPAMENTOS = [{key:"evento"},{key:"filial"},{key:"mes"}]` (labels já vêm de `AGRUPAMENTO_LABELS`). Só aplicar se `drillItem.card` estiver na lista de cards de valor conhecidos (`provento`, `desconto`, `total_liquido`, `custo_total`, `beneficios`, `inss_total`, `inss_patronal`, `hora_extra`, `provisoes`, `custo_ferias`, `rescisoes`, `fgts`). Assim o drawer dispara a chamada real e, se o backend responder 422, a mensagem 422 já existente aparece.
2. **Empty-state visível** — trocar o `<div className="mt-6 …">` do ramo "sem agrupamentos" por um bloco com borda/ícone dentro da área com padding do `SheetContent`, para nunca ficar em branco.
3. **Log de diagnóstico** — `console.debug("[ResumoFolha drill]", drillItem)` no `useEffect` quando `agrupamentos.length === 0`, para o usuário conseguir mandar o payload real caso o fallback também falhe.
4. **Nada de mudança de lógica de negócio, backend, cálculo ou schemas.**

## Fora de escopo

- Alterações em `src/lib/rh/api.ts`, endpoints, ou contrato do backend.
- Mudanças nos outros cards/drills que já funcionam.
