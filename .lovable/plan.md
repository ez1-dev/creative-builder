## Objetivo

Adicionar botão **Exportar Excel** (.xlsx) ao lado do **Exportar CSV** existente no dashboard de Passagens Aéreas, garantindo que a coluna **Valor** saia como número monetário formatado corretamente (R$ com 2 casas, milhar/decimal) — não como texto solto, que é a causa do problema relatado no print.

A biblioteca `xlsx` (SheetJS) já está nas dependências (usada no `ImportarPassagensDialog`), então reutilizamos.

## Mudanças

### 1. `src/components/passagens/PassagensDashboard.tsx`

**a) Nova função `exportPassagensXlsx(rows)`** ao final do arquivo, ao lado de `exportPassagensCsv`:
- Monta linhas com colunas: Data, Colaborador, Centro Custo, Projeto/Obra, Fornecedor, Cia Aérea, Nº Bilhete, Localizador, Origem, Destino, Data Ida, Data Volta, Motivo, Tipo, Valor (R$), Observações.
- Usa `XLSX.utils.aoa_to_sheet` e atribui `cell.t = 'n'` + `cell.z = 'R$ #,##0.00'` para a coluna **Valor**, garantindo formatação numérica/monetária no Excel.
- Datas como `Date` reais com `cell.z = 'dd/mm/yyyy'`.
- Define larguras de coluna (`!cols`) para boa apresentação.
- Salva via `XLSX.writeFile(wb, 'passagens-aereas-YYYY-MM-DD.xlsx')`.

**b) Nova prop opcional `onExportXlsx?: (rows: Passagem[]) => void`** no `Props` do `PassagensDashboard`.

**c) Botão adicional no toolbar do card "Registros"** (logo após o botão CSV nas linhas 608–612):
```
{onExportXlsx && (
  <Button size="sm" variant="outline" className="h-8 text-xs"
          onClick={() => onExportXlsx(displayRows)}
          disabled={displayRows.length === 0}>
    Exportar Excel
  </Button>
)}
```

**d) Também adicionar exportação Excel no Sheet de "Registros agrupados"** (atualmente só CSV em `exportGruposCsv` — linha 707). Adicionar botão **Exportar Excel** ao lado, com nova função local `exportGruposXlsx` que aplica o mesmo formato monetário na coluna Valor.

### 2. `src/pages/PassagensAereasPage.tsx`
- Importar `exportPassagensXlsx` junto de `exportPassagensCsv`.
- Passar `onExportXlsx={exportPassagensXlsx}` ao `<PassagensDashboard>`.

### 3. `src/pages/PassagensAereasCompartilhadoPage.tsx`
- Mesma alteração: importar e passar `onExportXlsx` para que o link público também tenha a exportação Excel.

## Resultado esperado

- Usuário vê dois botões lado a lado: **Exportar CSV** | **Exportar Excel**.
- No Excel gerado, a coluna **Valor** vem como número (não string), com formato `R$ #,##0.00`, permitindo somar/filtrar/ordenar corretamente — corrige o problema do print.
- Datas legíveis em formato BR.
- Mesmo comportamento no link compartilhado público.
