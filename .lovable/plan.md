# Normalizar valores de "Motivo da Viagem"

## Diagnóstico

Hoje no banco existem variações que poluem o filtro:

- `REMARCAÇÃO` (5)
- `REMARCACAO - ALTERACAO POR FAVOR TROCAR C A SV 18644199` (1)
- `REMARCACAO - ALTERACAO COLABORADOR PERDEU O VOO...` (1)
- `REMARCACAO - ALTERACAO ALTERAÇÃO DE VOO.` (1)
- `LAZER` (3)
- `PARTICULAR` (2)

Outros motivos (FOLGA DE CAMPO, TRANSFERENCIA DE OBRA, DEMISSÃO, etc.) ficam intactos.

## Mudança no banco (migration)

Atualizar `passagens_aereas` (preservando o texto original em `observacoes` quando houver detalhe extra):

```sql
-- Variantes de remarcação → "REMARCAÇÃO"
-- Move detalhe original para observacoes para não perder informação
UPDATE passagens_aereas
SET observacoes = COALESCE(NULLIF(observacoes,'') || ' | ', '') || 'Detalhe original: ' || motivo_viagem,
    motivo_viagem = 'REMARCAÇÃO'
WHERE motivo_viagem ILIKE 'REMARCA%' AND motivo_viagem <> 'REMARCAÇÃO';

-- LAZER → PARTICULAR
UPDATE passagens_aereas
SET motivo_viagem = 'PARTICULAR'
WHERE motivo_viagem = 'LAZER';
```

## Mudança no importador

Em `src/components/passagens/ImportarPassagensDialog.tsx`, no pré-processamento de cada linha aplicar o mesmo normalizador para `motivo_viagem`:

- Se começa com `REMARCA` (com ou sem acento) → `REMARCAÇÃO`, e o texto original vai para `observacoes`.
- Se for `LAZER` → `PARTICULAR`.

Assim importações futuras já entram normalizadas e o filtro continua limpo.

## Filtros

O dropdown de Motivo da Viagem em `PassagensDashboard.tsx` é montado dinamicamente a partir dos valores existentes — após a migration ele passa a mostrar apenas as opções consolidadas (REMARCAÇÃO, PARTICULAR, etc.), sem perder nenhum filtro existente. Nenhuma alteração de UI necessária.

## Arquivos afetados

- migration SQL (UPDATE em `passagens_aereas`)
- `src/components/passagens/ImportarPassagensDialog.tsx` (normalizador)
