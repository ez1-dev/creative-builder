# Esconder coluna Filial na grid do drill (BI Comercial)

## Objetivo
Remover a coluna "Filial" da tabela exibida no `ComercialDrillDrawer`, mantendo-a inalterada nos arquivos CSV/Excel exportados.

## Arquivo
`src/components/bi/drill/ComercialDrillDrawer.tsx`

## Mudança
No `useMemo` `displayColumns` (linha 229), após calcular `out` com todas as injeções existentes, filtrar a coluna `cd_filial` antes do `return out`:

```ts
out = out.filter((c) => c.key !== 'cd_filial');
```

## Por que assim
- Os botões CSV/Excel hoje chamam `downloadDrillCsv/Xlsx({ ...resp, columns: displayColumns })` — isso traria Filial fora.
- Para manter Filial no export, trocar a chamada dos botões para usar `enrichedBase.columns` (que ainda contém `cd_filial`) em vez de `displayColumns`.

## Aceite
- Coluna "Filial" não aparece mais na tabela do drawer em nenhum drill.
- CSV e Excel exportados continuam contendo a coluna "Filial".
- Demais colunas, totais por NF e linha TOTAL inalterados.
