
## Problema

Na lista de telas (painel esquerdo) o badge de contagem "X/Y" sobrepõe o final do nome da tela e a barra de rolagem do `ScrollArea` cobre parcialmente o badge — como visto no print enviado. Causa: coluna de 320 px estreita, badge dentro do flow do botão sem espaço reservado para scrollbar e nomes longos truncados.

## Mudanças (somente UI em `PermissoesPorTelaPanel.tsx`)

1. **Coluna esquerda mais larga e flexível**
   - Grid passa de `lg:grid-cols-[320px_1fr]` para `lg:grid-cols-[minmax(340px,380px)_1fr] xl:grid-cols-[420px_1fr]`.
   - `ScrollArea` ganha `pr-3` interno para não deixar a scrollbar encostar no badge.

2. **Item de tela em duas linhas (nome em cima, meta embaixo)**
   - Reestrutura cada `<button>` para layout vertical:
     - Linha 1: nome da tela completo, `whitespace-normal break-words leading-snug text-sm`.
     - Linha 2: badge "X/Y perfis" + caminho em `font-mono text-[10px] text-muted-foreground truncate`.
   - Badge fica **inline** na linha de metadata, não mais flutuando ao lado do nome → some o problema de sobreposição.
   - Item ativo mantém `bg-primary/10 border-l-2 border-primary`.

3. **Cabeçalho do módulo mais limpo**
   - Trigger do accordion vira `flex justify-between` com a contagem do módulo à direita (badge `outline`), e a label do módulo à esquerda. Mantém uppercase pequeno.

4. **Header do painel direito**
   - Badge "N de M perfis com acesso" passa para abaixo do título quando largura < `xl`, evitando wrap feio.
   - Botões de ação em lote agrupados em uma linha com `gap-2 flex-wrap` já existente, mas com `size="sm"` e ícones consistentes (já ok).

5. **Polimento**
   - `ScrollArea` da esquerda: altura `h-[560px]` (era 520), aproveitando viewport 790 px.
   - Item: `py-2 px-2.5 rounded-md`, espaçamento entre itens `space-y-1`.
   - Mantém todos os tokens semânticos (`bg-card`, `text-muted-foreground`, `bg-primary/10`, `border-border`). Zero cor hardcoded.

## Fora do escopo

- Lógica de toggle, bulk, copy, schema do banco, `ALL_SCREENS`, demais abas de Configurações.
- Painel direito (estrutura) — apenas ajustes finos no header.

## Critério de pronto

- Nome da tela nunca é cortado pelo badge nem pela scrollbar.
- Badge "X/Y" aparece numa segunda linha junto ao path, legível.
- Coluna esquerda mais larga em telas ≥ lg/xl; layout responsivo segue funcionando.
- Sem rolagem horizontal; sem cores hardcoded.
