## Correção: KPIs zerados no Painel de Compras

**Causa**: em `src/pages/PainelComprasPage.tsx` o `useMemo` do `kpisGerencial` (linha 569) lê apenas `dashboard.kpis`, mas os campos da API V2 (`valor_comprado`, `valor_pendente`, `valor_recebido`, `quantidade_ocs`, `quantidade_itens`, `quantidade_fornecedores`, `ticket_medio_oc`) chegam em `dashboard.kpis_dashboard`. Por isso os cards aparecem zerados.

### Alteração pontual

Arquivo: `src/pages/PainelComprasPage.tsx` — linha 569

De:
```ts
const k = dashboard.kpis;
```

Para:
```ts
const k = { ...(dashboard.kpis ?? {}), ...(dashboard.kpis_dashboard ?? {}) };
```

Com isso os campos da V2 (`kpis_dashboard`) prevalecem, e os do legado (`valor_bruto_total`, `valor_liquido_total`, `itens_pendentes`, `itens_atrasados`, `maior_atraso_dias`, etc.) continuam como fallback.

### Fora do escopo
- Não alterar as demais leituras (`dashboard.kpis?.…` nas linhas 337–340 e 877–880) — a instrução foi explicitamente "não mude mais nada da lógica".
- Nenhuma mudança no gráfico `por_tipo_despesa`; ele passa a renderizar sozinho após o restart do backend.

### Verificação
- Typecheck automático do projeto.
- Conferir visualmente no preview que Total Comprado, Qtd OCs, Qtd Itens, Qtd Fornecedores, Ticket Médio, Pendente, Recebido e Maior Fornecedor deixam de estar zerados.