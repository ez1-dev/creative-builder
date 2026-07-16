## Problema

O `DrillDrawer` (Razão/Lançamentos) já tem barra de rolagem horizontal flutuante (componente `FloatingHScrollbar`, ancorada acima do rodapé). Já o **`DrillResultadoPanel`** — o painel aberto pelo menu **Drills** (Conta Contábil, Cliente, Estado, Produto, etc.) na página `/contabilidade/dre-studio/.../visualizacao` — não tem. Como a tabela do drill fica dentro do `flex-1 overflow-auto` (linha 342), o scrollbar horizontal nativo aparece **só quando o usuário rola até o final vertical da lista**, obrigando descer para navegar entre colunas.

## Solução

Reaproveitar o mesmo padrão do `DrillDrawer`: extrair o componente `FloatingHScrollbar` para um arquivo compartilhado e usá-lo também no `DrillResultadoPanel`, ancorado logo abaixo da área rolável (acima do rodapé/limite do painel), com o `targetRef` apontando para o `<div className="overflow-x-auto ...">` que envolve a `<Table>`.

## Passos

1. **Extrair `FloatingHScrollbar`** para `src/components/dre-studio/FloatingHScrollbar.tsx` (mover as ~60 linhas do topo de `DrillDrawer.tsx`, com export nomeado).
2. **Atualizar `DrillDrawer.tsx`** para importar de `./FloatingHScrollbar` (remover a definição local).
3. **Atualizar `DrillResultadoPanel.tsx`**:
   - Criar `const drillScrollRef = useRef<HTMLDivElement>(null)`.
   - Anexar `ref={drillScrollRef}` no `<div className="overflow-x-auto rounded-lg border">` (linha 358).
   - Renderizar `<FloatingHScrollbar targetRef={drillScrollRef} />` **fora** do `flex-1 overflow-auto` (após o `</div>` da área rolável, linha 451), apenas quando `hasRows` for verdadeiro. Assim a barra fica fixa no rodapé do painel e sempre visível.

## Detalhes técnicos

- O `FloatingHScrollbar` já sincroniza `scrollLeft` bidirecionalmente via `ResizeObserver` + `MutationObserver`, e só se auto-renderiza quando `scrollWidth > clientWidth`, então some sem custo quando a tabela cabe na tela.
- Nenhuma mudança de estilo/tema — reutiliza `bg-background/90 backdrop-blur border-t border-border shadow-*` já existente, coerente com o token de design.
- Nenhuma mudança de dados, API ou lógica de drill — só apresentação.

## Fora de escopo

- Outros drawers (`DreDrillDrawer` de `/bi/contabilidade`, `ComercialDrillDrawer`) — se quiser, faço em um segundo passo.