

# Corrigir KPIs da Pagina Produzido no Periodo - Totais por Pagina vs Total Geral

## Problema
Os KPIs (Total Registros, Qtd Produzida, Peso Produzido, Qtd Etiquetas) somam apenas os registros da pagina atual (100 de 233 itens). Para o projeto 663 desenho 4200, o peso da pagina 1 mostra ~3.693 Kg, mas o total real e ~33.720 Kg (233 itens em 3 paginas). O usuario espera ver os totais gerais da consulta.

## Solucao
A API ja retorna `total_registros` no objeto de paginacao. Para os demais totais (peso, quantidade, etiquetas), a API nao retorna um `resumo`. Duas abordagens:

**Abordagem escolhida**: Usar `total_registros` da API para o KPI de registros (mostrando o total geral, nao so da pagina). Para peso, quantidade e etiquetas, manter a soma da pagina atual mas deixar o subtitle claro dizendo "pagina X de Y" em vez de apenas "na pagina atual". Isso da contexto ao usuario de que esta vendo uma parcial.

Adicionalmente, se o backend vier a adicionar um campo `resumo` (como em PainelCompras), o frontend ja estara preparado para usa-lo.

## Alteracoes em `src/pages/producao/ProduzidoPeriodoPage.tsx`

1. **KPI "Total Registros"**: Usar `data.total_registros` (total geral da API) em vez de `dados.length` (pagina atual)
2. **Subtitles dos KPIs de soma**: Mudar de "na pagina atual" para `pagina ${pagina} de ${data.total_paginas}` para dar contexto
3. **Subtitle do Total Registros**: Mudar para `${dados.length} nesta pagina` para mostrar ambos os valores

## Arquivo afetado
- `src/pages/producao/ProduzidoPeriodoPage.tsx`

