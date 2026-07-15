## Alteração

Em `src/components/dre-studio/DrillDrawer.tsx` (drawer de auditoria "Drill — (-)Devoluções" mostrado no print), separar a coluna combinada **Lote/Nº** em duas colunas independentes: **Lote** e **Número**.

### Mudanças pontuais

1. No `<TableHeader>` (linha ~167), trocar:
   ```
   <TableHead>Lote/Nº</TableHead>
   ```
   por dois cabeçalhos:
   ```
   <TableHead>Lote</TableHead>
   <TableHead>Número</TableHead>
   ```

2. No `<TableBody>` (linha ~179), trocar a célula única:
   ```
   <TableCell>{r.lote ?? ""} / {r.numero ?? ""}</TableCell>
   ```
   por duas células:
   ```
   <TableCell className="text-xs whitespace-nowrap">{r.lote ?? ""}</TableCell>
   <TableCell className="text-xs whitespace-nowrap">{r.numero ?? ""}</TableCell>
   ```

Nenhuma outra alteração: os demais drills (`DrillResultadoPanel`) já usam colunas separadas de Lote e Número.
