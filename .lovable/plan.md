## Objetivo

Na tela **Indicadores Contábeis** (`/contabilidade/indicadores`):
1. Tirar o painel **Análise (IA)** da barra lateral direita e movê-lo para o final da página (largura total, logo abaixo das seções e conferências técnicas).
2. Adicionar um botão **Baixar relatório** que gera um PDF com todos os indicadores + a narrativa da IA já gerada.

## Escopo

### 1. Reposicionar o painel "Análise (IA)"
Arquivo: `src/pages/contabilidade/IndicadoresContabeisPage.tsx`
- Remover o grid de 2 colunas (`lg:grid-cols-[1fr_360px]`). Seções passam a ocupar 100% da largura.
- Mover o `<Card>` de Análise IA para depois das seções e das "Conferências técnicas".
- Manter o card em largura total, com o texto da narrativa em uma coluna legível (`max-w-3xl`) para não esticar demais.
- Manter estados, streaming, aborts e mensagens de erro exatamente como estão hoje — só muda a posição.
- Ajuste no botão: rótulo/estado permanece (Gerar análise / Gerando… / Gerar novamente). Remover a nota "Gere sob demanda para evitar custo desnecessário" (redundante quando está no rodapé). Manter só: *"A IA interpreta os números acima — não recalcula nada."*

### 2. Botão "Baixar relatório" (PDF)
Arquivo: `src/pages/contabilidade/IndicadoresContabeisPage.tsx`
- Novo botão no header, à esquerda do "Exportar Excel". Ícone `FileText`, rótulo **Baixar relatório**. Tooltip: *"PDF com os indicadores do período + a última análise da IA gerada nesta tela."*
- Desabilitado enquanto `isLoading` ou sem dados. Se a IA ainda não foi gerada, gera o PDF só com os indicadores + aviso "Análise da IA não gerada".
- Enquanto exporta, mostra `Loader2` e rótulo "Gerando PDF…".

Novo módulo: `src/lib/contabil/indicadoresRelatorio.ts`
- Função `gerarPdfIndicadores({ periodo, empresa, filial, grupos, tecnicos, outros, duplicidade612, narrativa, modeloIA })`.
- Usa `jspdf` + `jspdf-autotable` (já presentes no projeto — mesmas libs usadas em `src/lib/pdf/relatorioSemanalObraPdf.ts`). Se `jspdf-autotable` não estiver no bundle, adicionar via `bun add jspdf-autotable`.
- Estrutura do PDF (A4 retrato):
  - Cabeçalho: título "Indicadores Contábeis", período `AAAAMM–AAAAMM`, empresa/filial, data/hora de geração.
  - Alerta 612 (se ativo), em bloco destacado.
  - Uma tabela por seção (Resultado, EBITDA, Rentabilidade, Prazos, Liquidez, Endividamento, Capital de giro, Outros, Conferências técnicas) com colunas: Indicador · Valor · Fórmula · Status. Formatação de valor idêntica à tela (`fmtValor`).
  - Página nova com título **Análise (IA)** e a narrativa em texto corrido (converter markdown básico → texto: manter parágrafos e bullets, ignorar formatação avançada). Rodapé "Modelo: X" se `modeloIA` presente. Se sem narrativa, imprime "Análise da IA não gerada nesta sessão."
- Nome do arquivo: `indicadores_contabeis_{codemp}_{ini}_{fim}.pdf`.
- Erros → `toast.error` na página.

## Fora de escopo
- Backend: não precisa de novo endpoint (PDF é montado no cliente com os dados já em memória).
- Excel/streaming/duplicidade: sem mudanças além do texto do rodapé da IA.
- Nenhuma alteração em números, cálculos, drawer de auditoria, filtros, badges.

## Detalhes técnicos

- `jspdf` + `jspdf-autotable` já é o padrão do projeto — reusar.
- Markdown → texto: implementação simples inline (`stripMarkdown`): remove `**`, `_`, `#`, converte `- ` em bullet `•`. Sem depender de nova lib.
- Layout do PDF segue o padrão dos outros relatórios (fonte Helvetica, títulos em azul primário `#1565FF`).
