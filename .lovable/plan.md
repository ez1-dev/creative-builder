## Situação atual
A tela `/bi/comercial/metas` **já existe** (`src/pages/bi/MetasFaturamentoPage.tsx`) com CRUD completo (listar/criar/editar/ativar/excluir) e bloco CONSOLIDADO calculado. O BI Comercial **já** sobrescreve Meta/Diferença/% Atingimento usando `fetchMetaCloudTotal` (`ComercialPage.tsx` linhas 137–151). A tabela `public.bi_meta_faturamento` existe com unique key `(anomes_emissao, unidade_negocio)`, RLS por `can_edit_bi_meta`, check em `unidade_negocio ∈ {GENIUS, ESTRUTURAL ZORTEA}`.

**O que falta** em relação ao pedido:
1. Colunas `ano`, `mes`, `codigo_unidade`, `descricao_unidade` na tabela (hoje só temos `anomes_emissao` e `unidade_negocio`).
2. Botão "Copiar para o ano inteiro" (replicar 1 valor nos 12 meses).
3. Importar/Exportar CSV.

## Mudanças

### 1. Migração — `bi_meta_faturamento`
Adicionar 4 colunas **geradas** (sem duplicar dado nem permitir divergência):
- `ano` int  ← `substring(anomes_emissao,1,4)::int`
- `mes` int  ← `substring(anomes_emissao,5,2)::int`
- `codigo_unidade` text ← `CASE unidade_negocio WHEN 'GENIUS' THEN '503' WHEN 'ESTRUTURAL ZORTEA' THEN '502' END`
- `descricao_unidade` text ← mesmo CASE (descrição explicativa)

Todas como `GENERATED ALWAYS AS (...) STORED`. Sem alteração de RLS, sem novas policies (já cobertas). Sem afetar o upsert por `(anomes_emissao, unidade_negocio)`.

### 2. `src/lib/bi/metasFaturamentoApi.ts`
- Estender `MetaFaturamento` com os 4 campos (read-only).
- Adicionar:
  - `copyAnoCompleto(anoAlvo, unidade, vlMeta, observacao?, ativo?)` → faz `upsert` de 12 linhas (mês 01–12) usando o mesmo `onConflict`.
  - `exportarCsvMetas(rows)` → string CSV (Anomes, Unidade, Codigo, Descricao, Valor, Observacao, Ativo).
  - `importarCsvMetas(file)` → parse + `upsert` em lote (validações: anomês YYYYMM, unidade ∈ {GENIUS, ESTRUTURAL ZORTEA}, valor numérico). Falhas reportadas linha a linha.

### 3. `src/pages/bi/MetasFaturamentoPage.tsx`
- Acrescentar colunas na tabela: Ano, Mês, Código, Descrição.
- Toolbar nova com 3 botões: **Copiar para o ano** (abre diálogo: unidade + valor + observação + ativo + ano-alvo), **Exportar CSV**, **Importar CSV** (file input oculto + parser).
- Após import/copy, invalida `['bi-metas']` e `['bi-comercial','meta-cloud']`.
- Mostrar `codigo_unidade` (503/502) ao lado da unidade na lista e no consolidado.

### 4. `ComercialPage.tsx`
**Nenhuma mudança** — `fetchMetaCloudTotal` já calcula:
- Meta = `SUM(vl_meta WHERE ativo AND anomes BETWEEN ini..fim AND (unidade=N OR CONSOLIDADO))`
- Diferença = `faturamento - meta`
- % Atingimento = `faturamento / meta * 100`

A migração só adiciona colunas geradas; o `select('*')` existente passa a retornar os novos campos automaticamente após regeneração dos types do Cloud.

## Fora de escopo
- Não alterar policies/grants.
- Não criar tela nova: a rota `/bi/comercial/metas` continua na mesma página, só ganha novas ações.
- Não tocar no FastAPI (metas são 100% Cloud).
