# Esclarecer escopo do filtro "Mês" no diálogo de importação

## Diagnóstico
O arquivo importado (`RELATORIO ABRIL PASSAGENS.xlsx`) contém **apenas linhas de abril/2026** (68 registros, datas 2026-04-06 a 2026-04-29). O filtro "Mês: Todos / Ano: 2026" filtra apenas linhas presentes na planilha — não busca dados de outros meses. O comportamento está correto; o que falta é deixar isso **explícito na UI** para evitar a confusão de "só veio abril".

## Mudança
**`src/components/passagens/ImportarPassagensDialog.tsx`** — adicionar, logo acima do bloco de filtros Mês/Ano, um aviso âmbar:

> ⚠ Os filtros abaixo selecionam linhas **dentro deste arquivo**. Para importar outros meses, abra a planilha correspondente (ex.: `RELATORIO MAIO PASSAGENS.xlsx`) e repita a importação.

E, no rótulo do card "Total no arquivo", trocar para "Linhas no arquivo (apenas este arquivo)" para reforçar.

## Sem mudanças em backend/schema
Apenas texto na UI.
