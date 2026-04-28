## Resumo

Ajustar `src/pages/ContasPagarPage.tsx` para (1) desmarcar automaticamente "Somente saldo aberto" quando Status = Pago/Liquidado, (2) remover o `<Alert>` provisório do Modo árvore (e os imports não usados). Reescrever `docs/backend-export-contas-pagar-arvore.md` como spec definitiva (regras de Status Pago, Data Pagamento, ordem "filtros → árvore", critérios de aceite). Deletar `docs/backend-contas-pagar-arvore-filtros.md`. Atualizar `.lovable/plan.md`.

Mapeamentos `data_pagamento_*` → `data_movimento_*`, escolha de endpoint árvore vs normal e propagação de filtros para a exportação **já estão corretos** no código atual (linhas 169‑173, 305‑311) — não há mudança a fazer aí, apenas confirmar nos critérios.

## Frontend — `src/pages/ContasPagarPage.tsx`

### 1. Handler `set` desmarca "Somente saldo aberto" no Pago

No reducer/handler `set` (≈ linha 218), após calcular `next`, adicionar:

```ts
if (key === 'status_titulo' && (value === 'PAGO' || value === 'LIQUIDADO')) {
  next.somente_saldo_aberto = false;
}
```

Mantém os guards existentes de `modo_arvore` ↔ `agrupar_por_fornecedor`.

Observação: o checkbox "Somente saldo aberto" hoje fica `disabled={!!filters.status_titulo}` (linha 419). Vamos manter — é coerente com a nova regra e impede o usuário de re-marcar enquanto há status selecionado.

### 2. Remover alerta provisório (linhas 463‑479)

Apagar todo o bloco `{modoArvoreAtivo && ( ... <Alert>...</Alert> )}`.

### 3. Limpar import não usado (linha 16)

Remover `import { Alert, AlertDescription } from '@/components/ui/alert';` (nenhum outro uso na página).

### 4. Itens já corretos (não mexer, apenas validar)

- Select de Status já envia `PAGO` (linha 353, opção com `value="PAGO"`).
- `data_pagamento_ini/fim` → `data_movimento_ini/fim` no `search` (linhas 169‑173) e no `exportParams` (linhas 305‑308).
- Endpoint de exportação alterna entre `/api/export/contas-pagar-arvore` e `/api/export/contas-pagar` conforme `modoArvoreAtivo` (linhas 309‑311).
- `modoArvoreAtivo` reusa o mesmo objeto `params` que o modo normal (linha 178), garantindo paridade de filtros.

## Documentação

### `docs/backend-export-contas-pagar-arvore.md` (reescrever)

Estrutura final:

1. **Escopo** — endpoints `GET /api/contas-pagar-arvore` (listagem) e `GET /api/export/contas-pagar-arvore` (XLSX) devem aplicar **exatamente os mesmos filtros** que `/api/contas-pagar`.
2. **Query params completos** (tabela): `status_titulo`, `somente_vencidos`, `somente_saldo_aberto`, `somente_cheques`, `incluir_pagos`, `excluir_pagos`, `data_emissao_ini/fim`, `data_vencimento_ini/fim`, `data_movimento_ini/fim`, `valor_min/max`, `numero_projeto`, `centro_custo`, `fornecedor`, `numero_titulo`, `tipo_titulo`, `codigo_filial`.
3. **Ordem de execução obrigatória**:
   1. Montar CTE `BASE` de Contas a Pagar.
   2. Aplicar **todos** os filtros no `WHERE` da `BASE` (mesma lógica do modo normal).
   3. Selecionar apenas os títulos filtrados.
   4. Só então fazer `LEFT JOIN` com `E075RAT` para montar a árvore/rateio.
   5. **Nunca** montar a árvore antes de filtrar.
4. **Regra Status Pago** — `status_titulo IN ('PAGO','LIQUIDADO')` deve casar quando:
   ```sql
   COALESCE(BASE.valor_aberto, 0) <= 0
   OR BASE.status_titulo IN ('PAGO','LIQUIDADO')
   ```
5. **Regra Data Pagamento**:
   ```sql
   CAST(BASE.data_ultimo_movimento AS DATE) >= :data_movimento_ini
   CAST(BASE.data_ultimo_movimento AS DATE) <= :data_movimento_fim
   ```
6. **Exportação** — `/api/export/contas-pagar-arvore` respeita exatamente os mesmos filtros da listagem.
7. **Layout XLSX** — preservar a seção atual (colunas, hierarquia visual, formatação, headers HTTP).
8. **Critérios de aceite** (10 itens, conforme pedido).

### `docs/backend-contas-pagar-arvore-filtros.md`

Deletar.

### `.lovable/plan.md`

Reescrever curto refletindo: alerta removido, regra "Status Pago desmarca Somente saldo aberto", paridade de filtros normal/árvore/exportação já garantida no frontend, e os itens obrigatórios do backend (Status Pago, Data Pagamento, ordem filtros → árvore, exportação).

## Critérios de aceite

1. Selecionar Status = Pago no select desmarca `somente_saldo_aberto`.
2. Status Pago envia `status_titulo=PAGO` (já ok).
3. `Data Pagamento Inicial/Final` envia `data_movimento_ini/fim` (já ok).
4. Modo árvore envia o mesmo `params` do modo normal (já ok).
5. Exportação Excel reusa o mesmo `params` e alterna endpoint árvore/normal (já ok).
6. Alerta de limitação removido; sem imports `Alert`/`AlertDescription` órfãos.
7. `docs/backend-export-contas-pagar-arvore.md` reescrito como spec definitiva.
8. `docs/backend-contas-pagar-arvore-filtros.md` deletado.
9. `.lovable/plan.md` atualizado.

## Fora de escopo

- Implementação SQL/Python no FastAPI (repositório separado).
- Alterações em Lovable Cloud / Supabase.
- Refatoração da tela de Contas a Pagar.