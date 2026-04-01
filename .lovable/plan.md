

# Reescrever Página Conciliação ERP x EDocs

A página já existe mas precisa ser completamente atualizada para usar o endpoint correto, filtros corretos e colunas corretas da API real.

## Alterações

### 1. `src/pages/ConciliacaoEdocsPage.tsx` — Reescrever completo

**Endpoint:** `GET /api/notas-edocs-conciliacao` (antes era `/api/conciliacao-edocs`)

**Filtros (todos os parâmetros da API):**
- Tipo Nota (select: TODOS/ENTRADA/SAIDA)
- Período inicial / final (date pickers)
- Número NF, Série, Filial
- Código Pessoa, Nome Pessoa, Número Lote
- Situação ERP (input), Situação EDocs (input)
- Status Conciliação (select: TODOS, OK, SEM_EDOCS, ERRO_EDOCS, DIVERGENCIA_SITUACAO, CHAVE_DIVERGENTE, NUMERO_DIVERGENTE, SERIE_DIVERGENTE)
- Checkboxes: Somente divergências, Somente sem EDocs, Somente com erro

**KPIs:** Total registros, OK, Sem EDocs, Com erro, Divergência situação

**Colunas da tabela (19 colunas):**
tipo_nota, codigo_empresa, codigo_filial, numero_nf, serie_nf, situacao_erp, situacao_edocs, status_conciliacao (badge), data_documento, numero_lote, codigo_pessoa, nome_pessoa, valor_liquido, valor_final, chave_nota, mensagem_edocs, id_requisicao_edocs, descricao_motivo_edocs, observacao_conciliacao

**Badges de status:**
- OK → verde (success)
- SEM_EDOCS → laranja/warning
- ERRO_EDOCS → vermelho (destructive)
- DIVERGENCIA_SITUACAO → laranja/warning
- CHAVE/NUMERO/SERIE_DIVERGENTE → amarelo (secondary/outline)

**Exportação:** `GET /api/export/notas-edocs-conciliacao` com mesmos filtros

### 2. `src/lib/api.ts` — Atualizar interface `ConciliacaoEdocsResponse`

Atualizar o resumo para incluir `total_com_erro` e ajustar campos conforme API real. Manter a estrutura `PaginatedResponse` existente.

### 3. Rota e sidebar — Sem alteração
Já existem e estão corretos.

