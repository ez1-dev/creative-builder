# Melhorar a forma de arrastar os gráficos

Hoje, no modo de edição do dashboard de Passagens Aéreas, o card inteiro é uma área de arraste. Isso causa três problemas:

1. Qualquer clique/toque dentro do gráfico pode iniciar um arraste acidental.
2. Não existe um indicador visual claro de "pegue aqui para arrastar".
3. O cursor não muda, o feedback durante o arraste é fraco e o placeholder do react-grid-layout usa cor padrão (não combina com o tema).

## O que mudar

### 1. Drag handle dedicado (`PassagensLayoutGrid.tsx`)

- Adicionar uma pequena barra superior no card (visível só em modo edição) com um ícone `GripVertical` + título do bloco, alinhada à esquerda — espelhando a barra de botões da direita.
- Configurar o react-grid-layout com `draggableHandle=".drag-handle"` em vez de depender de `draggableCancel`. Assim só a alça arrasta; o resto do card fica livre para scroll, hover, tooltips do Recharts, seleção de texto etc.
- Cursor: `cursor-grab` na alça, `cursor-grabbing` enquanto arrasta (via classe `react-draggable-dragging` que o RGL já aplica).
- Manter o `tabIndex`/teclado para redimensionar (já existe).

### 2. Feedback visual durante edição e arraste (`index.css`)

- Estilizar `.react-grid-placeholder` com `bg-primary/15`, `border-2 border-dashed border-primary/60` e `rounded-lg` — segue tokens do design system.
- Adicionar leve `box-shadow` e `scale(1.01)` no item enquanto `react-draggable-dragging`, para reforçar que está sendo movido.
- Item em hover no modo `is-editing` ganha um realce sutil na alça (já temos o ring no card).

### 3. Pequenos ajustes

- Aumentar `margin` do grid de `[16,16]` para `[12,12]` durante edição para o ghost/placeholder ficar mais previsível (opcional, manter atual se preferir).
- Garantir que a barra de botões da direita continua com `data-no-drag` (já está) — agora redundante com `draggableHandle`, mas inofensivo.

## Detalhes técnicos

Arquivos:

- `src/components/passagens/PassagensLayoutGrid.tsx`
  - Importar `GripVertical` de `lucide-react`.
  - Passar `draggableHandle=".drag-handle"` no `<ResponsiveGrid>` e remover (ou manter) `draggableCancel`.
  - Renderizar, dentro de cada item quando `editing`, um header:
    ```tsx
    <div className="drag-handle absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-md border bg-background/95 px-2 py-1 text-xs font-medium shadow-md backdrop-blur cursor-grab active:cursor-grabbing select-none">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="max-w-[160px] truncate">{w.title}</span>
    </div>
    ```
  - Adicionar `pt-9` (ou similar) no container do bloco quando `editing`, para a alça não cobrir o conteúdo.

- `src/index.css`
  - Adicionar regras:
    ```css
    .react-grid-placeholder {
      background: hsl(var(--primary) / 0.15) !important;
      border: 2px dashed hsl(var(--primary) / 0.6);
      border-radius: 0.5rem;
      opacity: 1 !important;
    }
    .layout.is-editing .react-grid-item.react-draggable-dragging {
      box-shadow: 0 10px 30px -10px hsl(var(--primary) / 0.4);
      z-index: 30;
    }
    .layout.is-editing .drag-handle:hover { background: hsl(var(--accent)); }
    ```

## Fora do escopo

- Não alterar a lógica de salvar layout, RLS ou comportamento de redimensionamento por botões/teclado.
- Não mexer em `BiblioBI` nem outros dashboards (apenas Passagens Aéreas usa este componente hoje).
