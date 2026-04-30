## Objetivo

No card "Mapa de Destinos", a lista de "Top destinos" deve ser ordenada pelo **valor total gasto** (não pela quantidade de passagens) e ter um botão "+" para mostrar mais itens além dos 5 iniciais.

## Mudanças em `src/components/passagens/MapaDestinosCard.tsx`

1. **Ordenar por valor**: trocar `cidades.sort((a, b) => b.qtd - a.qtd)` por `cidades.sort((a, b) => b.total - a.total)` no `useMemo` que monta `porCidade`.

2. **Limite dinâmico**: substituir `const top5 = porCidade.slice(0, 5)` por:
   - `const [topLimit, setTopLimit] = useState(5)` (resetado pelo botão de limpar zoom/seleção que já existe).
   - `const topDestinos = porCidade.slice(0, topLimit)`.

3. **UI**:
   - Renomear o título "Top 5 destinos" para "Top destinos por valor".
   - Trocar `top5.map(...)` por `topDestinos.map(...)`.
   - No item da lista, dar destaque ao **valor** (linha principal) e mover a quantidade para o badge secundário (já é o caso). Manter o `formatCurrency(p.total)` visível.
   - Abaixo da lista, adicionar dois botões pequenos lado a lado quando `porCidade.length > topLimit` ou `topLimit > 5`:
     - **+5** (`<Plus />` ícone): `setTopLimit((n) => Math.min(n + 5, porCidade.length))`.
     - **Mostrar menos** (aparece só se `topLimit > 5`): `setTopLimit(5)`.
   - Mostrar contador "exibindo X de Y" em texto pequeno e mudo.

4. **Reset**: quando o usuário limpa filtros/seleção (ações já existentes), opcionalmente resetar `topLimit` para 5 — evita lista enorme após mudar contexto.

## Comportamento final

- Lista ordenada do destino que mais consumiu valor para o que menos consumiu.
- 5 itens por padrão; clicar "+" expande de 5 em 5 até o total disponível.
- Botão "Mostrar menos" volta para 5.
- Cross-filter ao clicar em um destino continua funcionando igual.

## Arquivos envolvidos

- `src/components/passagens/MapaDestinosCard.tsx` (única mudança)
