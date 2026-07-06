# Plano — Atualização Passagens Aéreas (pedido do César)

## O que muda

### 1. Novo campo: **Produto**
A planilha nova traz a coluna `produto` (ex.: AÉREO). Hoje essa coluna não existe no cadastro. Vamos:

- Adicionar coluna `produto TEXT` na tabela `passagens_aereas` (backend/DB).
- Incluir `produto` no formulário de cadastro manual e no importador de planilha (mapear coluna `produto`).
- Incluir `produto` como filtro/dimensão disponível no dashboard.

### 2. Novo gráfico "Por Produto" (valor + %)
Card no dashboard, mesmo estilo do gráfico de referência que você mandou:
- Barras horizontais ordenadas por valor decrescente.
- Cada linha mostra **R$ valor** e **% do total** ao lado do rótulo.
- Total geral no topo do card.
- Já entra no layout padrão e pode ser mostrado/escondido pelo usuário.

### 3. Campos ocultados no dashboard e na tabela
Deixar de exibir (permanecem no cadastro e importação, só somem da visualização):
- Fornecedor
- Cia aérea
- Número do bilhete
- Localizador
- Data de ida
- Data de volta

### 4. Campos que continuam sendo destaque
Dashboard e tabela principal passam a mostrar apenas:
`Data Registro · Produto · Colaborador · Centro de Custo · Origem · Destino · Motivo da viagem · Valor`

Filtros, rankings, gráficos e exportações (CSV/XLSX/PPTX/PDF) são realinhados a essa lista.

## Detalhes técnicos (referência)

- **DB (migration)**: `ALTER TABLE passagens_aereas ADD COLUMN produto TEXT;` + índice em `produto`. Sem mudança de RLS/GRANTs.
- **Import**: `src/components/passagens/ImportarPassagensDialog.tsx` — mapear nova coluna, manter compatibilidade com planilhas antigas (produto opcional).
- **Cadastro manual**: `src/pages/PassagensAereasPage.tsx` — adicionar input Produto (livre, com autocomplete dos valores já existentes).
- **Dashboard**: `src/components/passagens/PassagensDashboard.tsx` e catálogo de séries `seriesSelectGroups.tsx` — nova série "Por Produto" (bar h + %), remover Fornecedor/Cia/Bilhete/Localizador/Datas ida-volta das opções visuais padrão.
- **Tabela**: colunas visíveis reduzidas à lista aprovada; colunas ocultas continuam exportáveis se marcadas (mas removidas do preset default).
- **Relatório executivo** (`RelatorioExecutivoPassagensPage.tsx`): trocar ranking "Top Cias" por "Top Produtos"; remover blocos que dependiam dos campos ocultos.
- **Link compartilhado**: herda automaticamente o novo layout.

## Fora do escopo
- Não altero regras de permissão, compartilhamento ou importação de outros módulos.
- Cadastros históricos ficam com `produto = NULL` até serem reimportados/editados (aparecem como "—" no gráfico).

Confirma que posso seguir?
