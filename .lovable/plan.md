## Plano

1. Corrigir o salvamento do layout RH para preservar toda a configuração do widget ao mover, redimensionar ou alterar altura/largura.
   - Hoje o salvamento de geometria monta um payload incompleto; isso pode apagar configuração de gráfico/substituição e fazer parecer que a edição não salvou.

2. Ajustar a fila de salvamento para não perder alterações rápidas.
   - Ao clicar várias vezes em aumentar/diminuir ou arrastar/redimensionar, combinar as mudanças pendentes por widget em vez de sobrescrever tudo com apenas o último evento.

3. Tratar layouts inválidos antes de enviar para o `react-grid-layout`.
   - Normalizar `x`, `y`, `w`, `h`, limites de largura/altura e evitar colisões que causam o erro `Maximum call stack size exceeded`.

4. Garantir que alterações feitas em “Configurar gráfico” continuem salvas junto com título, componente e mapeamento.
   - Salvar mantendo `componentId`, `mapping`, `options`, `customTitle`, `variant` e `hidden` já existentes.

5. Validar no navegador em uma página RH.
   - Entrar em “Editar layout”, alterar altura/largura/disposição, configurar um gráfico, concluir, recarregar a página e confirmar que tudo permanece salvo sem erro no console.