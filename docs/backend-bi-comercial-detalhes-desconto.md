# BI Comercial — Coluna Desconto em `/api/bi/comercial/detalhes`

## Objetivo
Expor o campo `vl_desconto` em cada linha do endpoint `GET /api/bi/comercial/detalhes`,
para alimentar a coluna "Desconto" no grid "Detalhamento por Nota Fiscal" do BI Comercial.

## Origem
- Tabela: `VM_FATURAMENTO` (já possui `VL_DESCONTO`).
- **Não alterar** UpQuery / ERP — o campo já existe.

## Ajuste no SELECT
Adicionar ao SELECT do endpoint:

```sql
COALESCE(vl_desconto, 0) AS vl_desconto
```

## Sem mudanças em
- Filtros, parâmetros, paginação.
- Shape do envelope de resposta (`items` / `total` / etc.).
- Demais endpoints `/api/bi/comercial/*`.

## Aceite
- Cada linha da resposta inclui `vl_desconto: number`.
- Frontend (`src/pages/bi/ComercialPage.tsx` → `colsDetalhes`) já consome o campo
  e renderiza a coluna entre "Vl. Bruto" e "Impostos", inclusive nas exportações
  CSV/Excel do `DataTableBI`.
