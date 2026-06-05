## Objetivo
Padronizar os nomes dos blocos do BI Comercial conforme nomenclatura usada no relatório Upquery (PDF anexo).

## Renomeações
Comparando os títulos atuais (screenshot) com o PDF, ajustar os defaults em `src/lib/bi/comercialWidgetCatalog.ts` e `src/hooks/useComercialLayout.ts`:

| Tipo | Título atual | Novo título (Upquery) |
|---|---|---|
| `kpi-liquido` | Líquido | **Fat. Líquido** |
| `kpi-devolucao` | Devolução | **Devoluções** |
| `resumo-faturamento` | Resumo Faturamento | **Faturamento** |
| `gauge-atingimento` | % Atingimento | **% Atingimento** (já ok) |

Os demais (`Faturamento`, `Impostos`, `Nº Vendas`, `Nº Clientes`, `Nº Estados`, `Ticket Médio`, `Quantidade`, `Preço Médio`) já batem com o PDF.

## Arquivos
- `src/lib/bi/comercialWidgetCatalog.ts` — atualizar `title` nas entradas `kpi-liquido`, `kpi-devolucao`, `resumo-faturamento`.
- `src/hooks/useComercialLayout.ts` — atualizar `title` correspondente em `COMERCIAL_DEFAULT_WIDGETS`.

## Observações
- Dashboards salvos no Cloud mantêm o título antigo (persistido por widget). A renomeação só impacta os defaults e novos blocos. Se o usuário quiser propagar para o dashboard salvo, ele pode clicar "Voltar ao padrão" no Configurar bloco, ou eu posso adicionar um script — fora deste escopo.
- Sem mudanças de dados/layout/UI.

## Fora de escopo
- Adicionar novos blocos de Quantidade/Preço Médio ao layout default.
- Mudanças de cor/estilo.
