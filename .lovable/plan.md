

# Corrigir mapeamento de Situação NF — Notas Fiscais de Recebimento

## Problema

O mapeamento atual (tanto no filtro quanto na coluna da tabela) usa valores incorretos do ERP. A documentação oficial do Senior (campo SitNfc) define 8 situações diferentes das que estão implementadas.

## Correção

**Arquivo**: `src/pages/NotasRecebimentoPage.tsx`

### 1. Atualizar o render da coluna `situacao_nf` (linhas 25-31)

Novo mapeamento:
- 1 = Digitada
- 2 = Fechada
- 3 = Cancelada
- 4 = Documento Fiscal Emitido (saída)
- 5 = Aguardando Fechamento (pós-saída)
- 6 = Aguardando Integração WMS
- 7 = Digitada Integração
- 8 = Agrupada

### 2. Atualizar as opções do filtro Select (linhas 184-189)

Substituir as 5 opções atuais pelas 8 opções corretas com os mesmos valores acima.

