

# Corrigir filtro de Situação NF — valores incompatíveis com a API

## Problema identificado

O filtro envia valores numéricos (`1`, `2`, `3`...) para a API, mas a API espera e retorna valores em **texto** (`DIGITADA`, `FECHADA`, `CANCELADA`...). Isso faz com que qualquer filtro de situação retorne zero resultados.

Evidência nos logs de rede:
- `?situacao_nf=2` → retorna `{"dados":[]}` (vazio)
- Sem filtro → retorna dados com `"situacao_nf":"FECHADA"` (texto)

## Correção

**Arquivo**: `src/pages/NotasRecebimentoPage.tsx`

### 1. Atualizar os valores do filtro Select (linhas 187-195)

Trocar os valores numéricos por texto que a API aceita:

| Atual (value) | Novo (value) | Label |
|---|---|---|
| `"1"` | `"DIGITADA"` | Digitada |
| `"2"` | `"FECHADA"` | Fechada |
| `"3"` | `"CANCELADA"` | Cancelada |
| `"4"` | `"DOC_FISCAL_EMITIDO"` | Doc. Fiscal Emitido |
| `"5"` | `"AGUARD_FECHAMENTO"` | Aguard. Fechamento |
| `"6"` | `"AGUARD_INTEGRACAO_WMS"` | Aguard. Integração WMS |
| `"7"` | `"DIGITADA_INTEGRACAO"` | Digitada Integração |
| `"8"` | `"AGRUPADA"` | Agrupada |

### 2. Atualizar o render da coluna `situacao_nf` (linhas 25-34)

Ajustar o mapeamento para usar as chaves em texto que a API realmente retorna:

```
"DIGITADA" → "Digitada"
"FECHADA" → "Fechada"
"CANCELADA" → "Cancelada"
...
```

Também manter o fallback `v || "-"` para exibir o valor bruto caso surja um valor não mapeado.

### Detalhes técnicos

- Os valores exatos dos `SelectItem` serão baseados no formato retornado pela API (ex: `"FECHADA"` em maiúsculas)
- Se a API aceitar variações (ex: `"Fechada"` vs `"FECHADA"`), será usado o formato em maiúsculas conforme observado nos dados reais

