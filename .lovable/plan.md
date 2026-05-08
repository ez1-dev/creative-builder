## Objetivo

Eliminar o espaço vazio no dashboard de Passagens Aéreas quando o usuário não tem permissão para um widget. Hoje o `react-grid-layout` reserva o espaço de cada widget mesmo quando o `<VisualGate>` retorna `null`, resultando em uma área grande em branco entre KPIs e o próximo bloco visível.

## Onde

`src/components/passagens/PassagensDashboard.tsx`

## Como

1. Importar `useUserVisuals` (já usado pelo `VisualGate`):
   ```ts
   import { useUserVisuals } from '@/hooks/useUserVisuals';
   ```

2. Dentro do `PassagensDashboard`, chamar uma vez:
   ```ts
   const { canSeeVisual } = useUserVisuals();
   ```

3. Construir o objeto `blocks` condicionalmente — só inclui chaves cujos visuais o usuário pode ver. Para cada bloco com `<VisualGate visualKey="X">`:
   - Em vez de sempre incluir `'mapa-destinos': (<VisualGate ...>...</VisualGate>)`, fazer:
     ```ts
     ...(canSeeVisual('passagens.mapa-destinos') ? { 'mapa-destinos': (<>...</>) } : {})
     ```
   - Idem para `'charts-row'` (key `passagens.kpis-charts`).
   - O bloco renderizado por dentro deixa de precisar do `<VisualGate>` (a checagem virou pré-condição da chave).

4. `'kpis-row'` e `'tabela-registros'` continuam sempre presentes (não estão atrás de `VisualGate`).

5. Como `PassagensLayoutGrid.orderedWidgets` já filtra `widgets` por `blocks[w.type]`, widgets sem chave somem da grade. O `compactType="vertical"` então sobe os blocos seguintes, fechando o gap.

6. Manter `useUserVisuals.loading` em conta: enquanto carrega, `canSeeVisual` retorna `false`. Para evitar piscar, condicionar o render do grid a `!loading` (ou seguir comportamento atual do `VisualGate` que já retorna null no loading — preferir o segundo para não atrasar KPIs/tabela). Vamos manter os 4 blocos sempre que `loading` for false; durante loading, omitir só os blocos sob gate, igual ao comportamento atual.

## Sem mudanças em

- Layout salvo no banco (`x/y/w/h` permanecem; `compactType` cuida de fechar o vazio).
- Hook `usePassagensLayout`, `PassagensLayoutGrid`, ou `VisualGate`.
- Permissões/cadastro de visuais.

## Resultado

Quando o usuário não pode ver `passagens.kpis-charts` ou `passagens.mapa-destinos`, esses widgets desaparecem totalmente da grade. Os blocos visíveis sobem e ocupam o espaço, eliminando o gap em branco visto no print.
