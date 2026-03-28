

# Corrigir mapeamento de Situação OC no Painel de Compras

## Problema
O dropdown e o helper `situacaoLabel` usam mapeamento incorreto. O backend usa:
1 = Aberto Total, 2 = Aberto Parcial, 3 = Suspenso, 4 = Liquidado, 5 = Cancelado, 6 = Aguardando Integração WMS, 7 = Em Transmissão, 8 = Preparação Análise ou NF, 9 = Não Fechado.

## Mudanças em `src/pages/PainelComprasPage.tsx`

### 1. Atualizar `situacaoLabel` (linha 22)
```ts
const map: Record<number, string> = {
  1: 'Aberto Total', 2: 'Aberto Parcial', 3: 'Suspenso',
  4: 'Liquidado', 5: 'Cancelado', 6: 'Aguard. Integração WMS',
  7: 'Em Transmissão', 8: 'Prep. Análise/NF', 9: 'Não Fechado'
};
```

### 2. Atualizar opções do Select (linhas 116-123)
Substituir as opções atuais por:
- `TODOS` → Todas
- `1` → Aberto Total
- `2` → Aberto Parcial
- `3` → Suspenso
- `4` → Liquidado
- `5` → Cancelado
- `6` → Aguard. Integração WMS
- `7` → Em Transmissão
- `8` → Prep. Análise/NF
- `9` → Não Fechado

Remover a opção `0` (Aberta) que não existe no backend.

