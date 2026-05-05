# Corrigir ortografia "DESISTÃªNCIA" → "DESISTÊNCIA"

No filtro de Motivo da Viagem aparece `DESISTÃªNCIA` (encoding quebrado vindo da planilha original). Corrigir.

## Banco
```sql
UPDATE passagens_aereas
SET motivo_viagem = 'DESISTÊNCIA'
WHERE motivo_viagem ILIKE 'DESIST%' AND motivo_viagem <> 'DESISTÊNCIA';
```

## Importador
Em `src/components/passagens/ImportarPassagensDialog.tsx`, no normalizador de `motivo_viagem`, adicionar regra: se o valor começar com `DESIST` (qualquer encoding) → `DESISTÊNCIA`.
