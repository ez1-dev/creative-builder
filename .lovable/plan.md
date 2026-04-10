

# Revisar Estruturação dos Filtros — Notas Fiscais de Recebimento

## Problemas Atuais

- Todos os filtros são `Input` simples, sem sugestões (ComboboxFilter)
- Filtros sem agrupamento lógico — campos de NF, fornecedor, item, projeto e valores misturados
- Campos como Transação, Centro de Custo e Depósito poderiam usar ComboboxFilter com opções extraídas dos dados carregados
- Falta filtro de data de emissão (só tem recebimento)
- Falta filtro por depósito (existe na coluna mas não nos filtros)
- Falta filtro por OC Origem (existe na coluna mas não nos filtros)
- Falta placeholder nos inputs para orientar o usuário

## Mudanças Propostas

### 1. Reorganizar ordem dos filtros por agrupamento lógico

```text
Linha 1: NF / Série / Situação NF / Fornecedor / OC Origem (dados da nota)
Linha 2: Código Item / Descrição Item / Tipo Item / Transação / Depósito (dados do item)
Linha 3: Centro Custo / Projeto / Emissão de / Emissão até / Recebimento de (contexto)
Linha 4: Recebimento até / Valor Líq. Mín / Valor Líq. Máx (complementares)
```

### 2. Converter filtros para ComboboxFilter (com opções dos dados carregados)

- **Transação** — extrair valores únicos de `data.dados` campo `transacao`
- **Depósito** — extrair valores únicos de `data.dados` campo `deposito`
- **Centro de Custo** — extrair de `codigo_centro_custo` + `descricao_centro_custo`

Usar `useMemo` para gerar as opções a partir de `dados` (mesmo padrão do `useErpOptions` mas local).

### 3. Adicionar filtros ausentes

- **Data Emissão de/até** (`data_emissao_ini`, `data_emissao_fim`)
- **Depósito** (`deposito`)
- **OC Origem** (`numero_oc_origem`)

### 4. Adicionar placeholders descritivos nos inputs

### Arquivo modificado
- `src/pages/NotasRecebimentoPage.tsx`

