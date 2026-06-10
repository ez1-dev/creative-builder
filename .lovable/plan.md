# Plano

## Objetivo
Fazer o cabeçalho do relatório aparecer corretamente no layout de impressão/PDF, incluindo:
- Título: `Relatório Executivo de Faturamento`
- Subtítulo: `Período 202601 – 202606 • Unidade: CONSOLIDADO`

## O que vou ajustar
1. Revisar o container imprimível `#rel-doc` para evitar que o topo seja cortado ou suprimido no modo de impressão.
2. Fortalecer as regras de impressão do cabeçalho (`.rel-header`, `.rel-titulo`, `.rel-subtitulo`, `.rel-data`) para garantir renderização visível no PDF.
3. Ajustar a estrutura do topo do documento, se necessário, para impedir que o cabeçalho seja afetado por regras globais de `visibility`, fluxo de layout ou quebra de página.
4. Validar que o cabeçalho continue visível tanto no preview quanto na exportação por `window.print()`.

## Arquivos envolvidos
- `src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx`
- `src/pages/bi/relatorio.css`

## Detalhes técnicos
- O cabeçalho já está presente no DOM dentro de `#rel-doc`.
- A causa provável está no CSS de impressão atual, que usa isolamento por `visibility` em todo o `body` e posicionamento absoluto de `#rel-doc`, combinação que pode fazer o topo do documento não entrar corretamente na composição do PDF.
- A correção ficará só no frontend/layout de impressão, sem mexer em backend nem na lógica dos dados.

## Fora de escopo
- Alterar conteúdo do relatório
- Mudar exportação PPTX
- Ajustar outros blocos além do cabeçalho impresso