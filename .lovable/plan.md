# Exportar DRE para XLSX

Adicionar botão "Exportar XLSX" na tela `Contabilidade — DRE` (`src/pages/bi/contabilidade/DrePage.tsx`) que gera o arquivo direto no navegador, sem depender do backend.

## Escopo

- Botão "Exportar XLSX" no cabeçalho de filtros, ao lado de "Atualizar".
- Desabilitado durante `loading` ou quando `linhas.length === 0`.
- Usa as linhas já carregadas (mesmo recorte de meses + unidade + ano).

## Conteúdo do arquivo

Aba única `DRE {ano}`:

- Linhas 1-3: cabeçalho com Empresa "Sapiens", "DRE — {ano}", filtros aplicados (unidade, período mês inicial-final).
- Linha 5: cabeçalho merge — coluna A "Máscara" + para cada mês (filtrado) e TOTAL, merge de 3 colunas com o nome do mês.
- Linha 6: subcabeçalho `Realizado | A.V. | Orçado` para cada bloco.
- Demais linhas: uma por linha da DRE (`descricao`, depois `<mes>_realizado`, `<mes>_av`, `<mes>_orcado` e `total_realizado`, `total_av`, `total_orcado`).

## Formatação

- Valores monetários: `#,##0.00;[Red](#,##0.00);-` (negativos em vermelho entre parênteses, zeros como "-").
- Colunas A.V.: formato `0.0%;[Red](0.0%);-` (valor já vem como percentual numérico — dividir por 100 ao gravar).
- Linhas totalizadoras (`RECEITA_LIQUIDA`, `LUCRO_BRUTO`, `EBITDA`, `EBIT`, `RESULTADO_EXERCICIO`): fonte negrito + preenchimento azul claro do tema (cor fixa hex `#DBEAFE`, fonte `#1E3A8A`).
- Bloco TOTAL com fundo levemente destacado (`#EFF6FF`).
- Cabeçalhos com fundo cinza claro (`#F1F5F9`) e negrito.
- Congelar painel após linha 6 / coluna A.
- Largura: coluna A = 42; demais = 14.
- Auto-filter na linha 6.

## Implementação

- Já existe `xlsx` (SheetJS) no projeto? Se não, adicionar `xlsx` via `bun add xlsx` em build mode. Verificarei antes de gerar; se já houver `exceljs` em uso, prefiro `exceljs` (suporta merges + estilos por célula nativamente). Provável escolha: **`exceljs`**, pois precisamos de cores e merges.
- Adicionar função `exportarXlsx()` em `DrePage.tsx` que monta o workbook com `exceljs`, gera blob e dispara download com nome `dre_{ano}_{unidade}_{mesIni}-{mesFim}.xlsx`.
- Sem mudanças no backend e sem mudanças em outras telas.

## Fora de escopo

- Exportar via FastAPI.
- PDF, CSV.
- Outras telas de BI.
