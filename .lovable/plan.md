# Corrigir Cia Aérea / Motivo nos registros de Passagens Aéreas

## Diagnóstico

Conferi a planilha de abril e o banco. O importador **atual** já mapeia certo:
- coluna `ITEM` (FOLGA DE CAMPO, PARTICULAR…) → `motivo_viagem`
- coluna `CIA AÉREA` (LATAM, GOL, AZUL…) → `cia_aerea`
- coluna `TIPO` (PASSAGEM AEREA NACIONAL…) → `tipo_despesa` (classificado em Aéreo/Ônibus/Outros)

Os 68 registros importados de abril/2026 já estão corretos (cia=LATAM/GOL/AZUL, motivo=FOLGA DE CAMPO, etc.).

O problema está em **registros antigos** (importações anteriores) onde `cia_aerea` ficou preenchida com a categoria em vez do nome da cia:

| cia_aerea (errado) | qtd |
|---|---|
| AÉREO | 256 |
| ÔNIBUS | 37 |
| HOTEL | 5 |
| LOCAÇÃO AUTOMOVEIS S/MOTORISTA | 2 |

Nesses registros o `motivo_viagem` está OK — só a Cia está “poluída” com o tipo.

## O que vou fazer

### 1. Migração de limpeza dos registros existentes

Atualizar `passagens_aereas`:

- Quando `cia_aerea` for `'AÉREO'` / `'AEREO'` → ajustar `tipo_despesa = 'Aéreo'` e setar `cia_aerea = NULL`.
- Quando `cia_aerea` for `'ÔNIBUS'` / `'ONIBUS'` → `tipo_despesa = 'Ônibus'`, `cia_aerea = NULL`.
- Quando `cia_aerea` for `'HOTEL'` ou `'LOCAÇÃO AUTOMOVEIS S/MOTORISTA'` → `tipo_despesa = 'Outros'`, `cia_aerea = NULL` (e copiar o valor original para `observacoes` para não perder a informação).

### 2. Reforço no importador (`ImportarPassagensDialog.tsx`)

Adicionar uma sanitização final pós-mapeamento: se a `cia_aerea` resolvida for um dos termos categóricos (`AÉREO`, `ÔNIBUS`, `HOTEL`, `LOCAÇÃO…`), trata como tipo e limpa o campo `cia_aerea`. Isso evita que qualquer planilha futura com layout diferente repita o mesmo problema.

Nenhuma mudança visual / no formulário de cadastro manual.
