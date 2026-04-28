## Contas a Pagar — filtros + Modo árvore + Exportação

### Frontend (`src/pages/ContasPagarPage.tsx`)

- **Status Pago/Liquidado desmarca "Somente saldo aberto"**: regra adicionada no
  handler `set` para evitar combinação contraditória de filtros. O checkbox já
  era `disabled` quando havia status selecionado — comportamento mantido.
- **Alerta provisório do Modo árvore removido** (junto com o import órfão de
  `Alert`/`AlertDescription`). A correção definitiva passa a depender do backend
  (ver spec).
- **Já estava correto e foi apenas validado**:
  - Select de Status envia `status_titulo=PAGO`.
  - Campos "Data Pagamento Inicial/Final" são mapeados para
    `data_movimento_ini/fim` antes da chamada (tanto na pesquisa quanto na
    exportação).
  - Modo árvore reusa o **mesmo objeto `params`** do modo normal — paridade
    total de filtros entre `/api/contas-pagar`, `/api/contas-pagar-arvore` e os
    endpoints de exportação correspondentes.
  - Botão "Exportar Excel" alterna automaticamente entre
    `/api/export/contas-pagar` e `/api/export/contas-pagar-arvore` conforme o
    modo ativo.

### Documentação

- **`docs/backend-export-contas-pagar-arvore.md`** reescrito como spec
  definitiva: cobre listagem árvore + exportação, lista todos os params,
  define **ordem obrigatória "filtros → árvore"**, regras de Status Pago e
  Data Pagamento, layout XLSX e 10 critérios de aceite.
- **`docs/backend-contas-pagar-arvore-filtros.md`** removido (consolidado no
  arquivo acima).

### Correções obrigatórias no backend (FastAPI — fora deste repo)

1. `/api/contas-pagar-arvore` e `/api/export/contas-pagar-arvore` devem aplicar
   **todos** os filtros antes de montar a árvore.
2. Status Pago: `COALESCE(valor_aberto,0) <= 0 OR status_titulo IN ('PAGO','LIQUIDADO')`.
3. Data Pagamento: `CAST(data_ultimo_movimento AS DATE)` entre
   `data_movimento_ini` e `data_movimento_fim`.
4. Exportação respeita exatamente os filtros da listagem.

### Fora de escopo

- Implementação SQL/Python no FastAPI (repositório separado).
- Mudanças em Lovable Cloud / Supabase.
- Refatoração da tela de Contas a Pagar.
