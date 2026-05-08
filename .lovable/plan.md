# Plano

## Objetivo
Eliminar o tremor/bug visual nos gráficos do dashboard de Passagens Aéreas (modo visualização e link compartilhado), mantendo a correção que faz o link respeitar o layout salvo pelo administrador.

## Causa
Após a última mudança, o grid passou a ter duas fontes ressincronizando o estado local de layout ao mesmo tempo:
1. O efeito novo, que aplica o layout salvo no banco sempre que ele muda fora do modo de edição.
2. O `handleLayoutChange` interno do `react-grid-layout`, que continua disparando no modo de visualização e sobrescrevendo o estado com posições recalculadas pela própria biblioteca.

Quando essas duas fontes discordam (ex.: compactação vertical do grid vs. layout salvo), o componente entra num ciclo de reaplicação que aparece como “tremor” na tela.

## Implementação
- Restringir a sincronização local feita pelo `react-grid-layout` para acontecer apenas no modo de edição (drag/resize/cliques nos botões de redimensionar).
- Manter no modo de visualização/compartilhado uma fonte única da verdade: o layout que vem do banco.
- Garantir que o efeito de ressincronização continue refletindo mudanças reais de geometria salvas pelo administrador, sem entrar em loop.

## Validação
- Abrir o dashboard como administrador (modo leitura) e confirmar que os gráficos não tremem nem mudam de posição sozinhos.
- Entrar em modo de edição, mover/redimensionar blocos, salvar e verificar que o layout salvo aparece estável depois.
- Abrir o link compartilhado (com e sem senha) e confirmar que a disposição é exatamente a salva pelo admin, sem tremor.

## Arquivos
- `src/components/passagens/PassagensLayoutGrid.tsx`