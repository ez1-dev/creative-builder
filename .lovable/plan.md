# Garantir KPIs globais — Painel de Compras & NF de Recebimento

## Diagnóstico

Ambas as telas já chamam endpoints `*-dashboard` agregados. Porém, hoje os KPIs ainda misturam dados da amostra (50k linhas paginadas) quando o backend não expõe certos campos:

**`src/pages/NotasRecebimentoPage.tsx`** (`kpis` em ~L348-407):
- Mesmo com `dashboard` presente, calcula `valorBruto`, `qtdRecebida`, `maiorFornecedor`, `nfsComOc`, `nfsSemOc`, `pctComOc`, `pctSemOc` somando o array `dados` (que é a amostra agregada de 50k, não a base completa).
- Comentário no código admite explicitamente: "Para indicadores que o backend ainda não expõe, usamos a amostra como aproximação."

**`src/pages/PainelComprasPage.tsx`** (`kpisGerencial` em ~L512-555):
- Quando `dashboard` está presente, usa apenas KPIs do backend. Correto.
- Maior fornecedor é derivado do `por_fornecedor` do dashboard. Correto.
- Fallback (sem dashboard) ainda calcula tudo a partir de `dadosFiltrados` (até 50k). Aceitável apenas como degradação, mas atualmente nunca exibe aviso de amostragem se total ≤ 50k.

**Tipos (`src/lib/api.ts`)** estão incompletos para cobrir 100% dos KPIs que o usuário listou.

## Mudanças

### 1. Backend (FastAPI) — atualizar specs e implementação

**`docs/backend-notas-recebimento-dashboard.md`** — ampliar `kpis` para incluir TODOS os campos do KPI:
```json
"kpis": {
  "quantidade_nfs", "quantidade_itens", "quantidade_fornecedores",
  "valor_bruto_total", "valor_liquido_total", "quantidade_recebida_total",
  "valor_medio_nf",
  "nfs_com_oc", "nfs_sem_oc", "pct_com_oc", "pct_sem_oc",
  "maior_fornecedor": { "codigo": "...", "nome": "...", "valor": 0 },
  "total_produtos", "total_servicos",
  "total_digitadas", "total_fechadas", "total_canceladas"
}
```
Calcular tudo na query agregada (sem OFFSET/FETCH), seguindo o padrão `sql_resumo` da conciliação EDocs (descrito na seção 3 do pedido).

**`docs/backend-painel-compras-dashboard.md`** — ampliar `kpis`:
```json
"kpis": {
  "valor_comprado", "valor_recebido", "valor_pendente",
  "quantidade_ocs", "quantidade_itens", "quantidade_fornecedores",
  "ticket_medio_oc", "percentual_recebido",
  "valor_bruto_total", "valor_liquido_total",
  "itens_pendentes", "itens_atrasados", "maior_atraso_dias",
  "maior_fornecedor": { "codigo": "...", "nome": "...", "valor": 0 }
}
```

Em ambos: docs reforçam que `sql_resumo` roda primeiro, sem paginação, e retorna apenas o objeto `kpis` + buckets de gráficos.

### 2. `src/lib/api.ts` — ampliar interfaces

Atualizar `PainelComprasDashboardResponse.kpis` e `NotasRecebimentoDashboardResponse.kpis` com todos os novos campos opcionais (mantendo retrocompatibilidade com `?:`).

### 3. `src/pages/NotasRecebimentoPage.tsx`

Reescrever o `useMemo` `kpis` (L348-407):
- Quando `dashboard` está presente: ler **exclusivamente** de `dashboard.kpis` (sem somar `dados`). Para campos ausentes no backend, exibir `'--'`.
- Quando em fallback (`!dashboard`): seguir cálculo client-side atual sobre o agregado, mas sempre exibir o aviso `amostragemAtiva` quando `totalAgregado >= TAMANHO_AGREGADO`.
- Remover a mistura `dashboard.kpis + dados.reduce(...)`.

### 4. `src/pages/PainelComprasPage.tsx`

Reescrever `kpisGerencial` (L512-555):
- Quando `dashboard` presente: mapear todos os campos novos (`itens_pendentes`, `itens_atrasados`, `maior_atraso`, `maior_fornecedor`) direto de `dashboard.kpis`.
- Manter fallback client-side sobre `dadosFiltrados`, mas exibir aviso de amostragem quando o fallback estiver ativo e `totalAgregadoCompras >= TAMANHO_AGREGADO`.
- Verificar contexto AI (`useAiPageContext`, L239-244): hoje lê `(data as any).resumo` (paginado). Trocar para `dashboard?.kpis` quando disponível.

### 5. Critérios de aceite (validação manual após implementação)

- Filtrar 1.000 registros, paginar a tabela: KPIs permanecem idênticos entre páginas.
- Alterar filtro: KPIs e tabela recalculam (ambas chamadas refeitas).
- Aviso de amostragem só aparece em fallback genuíno (endpoint dashboard indisponível) e total > 50k.
- Exportação continua usando `tamanho_pagina=todos` na rota paginada (sem alteração).

## Arquivos tocados

- `docs/backend-notas-recebimento-dashboard.md` (atualização da spec)
- `docs/backend-painel-compras-dashboard.md` (atualização da spec)
- `src/lib/api.ts` (ampliar interfaces)
- `src/pages/NotasRecebimentoPage.tsx` (refatorar `kpis`)
- `src/pages/PainelComprasPage.tsx` (refatorar `kpisGerencial` + AI context)

Sem novas rotas, sem migração de banco, sem mudança em autenticação. A implementação no FastAPI fica a cargo do time de backend, guiada pelos docs atualizados.