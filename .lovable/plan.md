

# Análise: KPIs Expedido para Obra divergem da Query SQL

## Diagnóstico

Comparei a query SQL enviada com o código do frontend (`ExpedidoObraPage.tsx`). A lógica de consolidação do frontend está correta — soma todas as páginas em background. O problema está na **diferença entre o que a API retorna e o que a query SQL calcula**.

### Diferença de granularidade e fonte de dados

| Aspecto | Query SQL (referência) | API `/api/producao/expedido` (frontend) |
|---------|----------------------|----------------------------------------|
| Granularidade | 1 linha por (projeto, desenho, revisão) | 1 linha por item/etiqueta/carga |
| Campo peso | `KG_EXPEDIDO = SUM(ree.USU_PESREA)` | `peso_real` por linha |
| Campo qtd | `QTD_CODBAR_EXPEDIDOS` (códigos de barras distintos) | `quantidade_expedida` por linha |
| Cargas | `QTD_CARGAS = COUNT(DISTINCT USU_NUMCAR)` | `numero_carga` (contagem distinta no frontend) |
| Filtro expedição | `USU_NUMCAR IS NOT NULL AND USU_DATCAR IS NOT NULL` | Depende do backend |

### Causas prováveis da divergência

1. **Duplicação de peso**: Se a API retorna múltiplas linhas para a mesma etiqueta (ex: uma por carga), o `SUM(peso_real)` no frontend contará o peso múltiplas vezes, enquanto a query SQL usa `SUM` agrupado por desenho com JOIN direto na tabela REE.

2. **Campo diferente**: A query usa `ree.USU_PESREA` (peso real da etiqueta). O campo `peso_real` na API pode mapear para outro campo ou já vir multiplicado/ajustado.

3. **Filtros diferentes**: A query SQL filtra `NULLIF(USU_NUMCAR, '') IS NOT NULL AND USU_DATCAR IS NOT NULL`. Se a API não aplica esses mesmos filtros, incluirá itens não expedidos.

4. **`quantidade_expedida` vs `QTD_CODBAR_EXPEDIDOS`**: A query conta códigos de barras distintos (`COUNT(DISTINCT USU_CODBAR)`), enquanto o frontend soma um campo `quantidade_expedida` que pode ter valor diferente.

## Recomendação

O problema não está no frontend (a consolidação funciona). Está no **backend da API** — o endpoint `/api/producao/expedido` precisa ser ajustado para retornar dados consistentes com a query mestra, ou adicionar um objeto `resumo` com os totais pré-calculados.

### Opção recomendada: Adicionar `resumo` no endpoint da API

O endpoint `/api/producao/expedido` deveria retornar um campo `resumo` (como já fazem outros endpoints como Painel de Compras e Notas de Recebimento):

```json
{
  "resumo": {
    "total_registros": 233,
    "quantidade_expedida": 1500,
    "peso_expedido": 33720.5,
    "cargas_distintas": 12
  },
  "dados": [...],
  "total_paginas": 3
}
```

O frontend **já está preparado** para consumir esse `resumo` (linhas 65-76 do `ExpedidoObraPage.tsx`). Basta o backend começar a retorná-lo.

### Ação no backend (fora do Lovable)

Ajustar o endpoint Python/FastAPI do ERP para incluir o `resumo` usando a mesma lógica da query SQL enviada — especificamente a CTE `expedido` (linhas 229-263) que calcula `KG_EXPEDIDO = SUM(ree.USU_PESREA)`.

### Sem alterações necessárias no frontend

O código atual já:
- Prioriza `resumo` da API se disponível (linhas 66-76)
- Faz fallback para consolidação manual se não houver `resumo`
- A consolidação manual é correta para os dados que recebe — o problema é que os dados individuais da API podem ter granularidade diferente da query

