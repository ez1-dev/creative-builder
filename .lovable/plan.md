# Adicionar Tipo de Veículo em Manutenção de Frota

## Banco de dados (Lovable Cloud)

Migração na tabela `manutencao_frota`:
- Adicionar coluna `tipo_veiculo text` (nullable).
- Atualizar trigger `normalize_frota_upper` para normalizar `tipo_veiculo` em UPPER/trim.
- Backfill auto-classificando os registros existentes a partir de `veiculo_descricao`:
  - contém `GUINDASTE` → `GUINDASTE`
  - contém `MUCK` → `MUCK`
  - contém `CAÇAMBA` / `CACAMBA` → `CAÇAMBA`
  - contém `CARRETA` → `CARRETA`
  - contém `CAMINHÃO` / `CAMINHAO` ou `ATEGO`, `STRALIS`, `S-WAY`, `L220` → `CAMINHÃO`
  - contém `STRADA`, `GOL`, `SW4`, `VOLCANO`, `FREEDOM` → `LEVE`
  - resto / `null` → `OUTRO`

## Frontend

**`src/pages/ManutencaoFrotaPage.tsx`**
- Incluir `tipo_veiculo` em `emptyForm` (default `'LEVE'`) e no `payload` do `handleSave`.
- Adicionar `<Select>` "Tipo de veículo" no formulário (Novo/Editar) com as opções:  
  `LEVE`, `CAMINHÃO`, `CARRETA`, `GUINDASTE`, `CAÇAMBA`, `MUCK`, `OUTRO`.
- Posicioná-lo na primeira linha do grid, ao lado de Segmento.

**`src/components/frota/FrotaDashboard.tsx`**
- Adicionar `tipo_veiculo?: string | null` em `ManutencaoFrota`.
- Novo filtro multi-select "Tipo de veículo" no painel de filtros.
- Nova coluna "Tipo" na tabela de registros.
- Novo card opcional **"Gasto por Tipo de Veículo"** (gráfico de barras), com chave de visual key `chart-tipo-veiculo` (registrado para que possa ser ocultado em compartilhamento e no `upsert_frota_dashboard_default`).

**`src/components/frota/ImportarFrotaDialog.tsx`**
- Aceitar coluna opcional `tipo` / `tipo_veiculo` na planilha; se ausente, aplicar a mesma auto-classificação do backfill.

## Fora do escopo
- Não muda permissões, RLS, links de compartilhamento, nem o backend FastAPI/ETL.
- Não altera a tela compartilhada além de receber o novo campo automaticamente via `select *`.
