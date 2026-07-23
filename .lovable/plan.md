## Contexto

O pacote A+B+E do backend (checkbox "Incluir títulos pagos", filtro "Parcial" em Receber, export árvore de Receber, rótulo "Data do último movimento") já está implementado nas duas telas — confirmado por leitura de `ContasPagarPage.tsx` e `ContasReceberPage.tsx`. Falta apenas o **item 5** deste prompt consolidado: o parâmetro `base_valor` (base do filtro Valor mín/máx).

## Escopo

Adicionar o seletor **"Base: Valor original ▾ / Saldo em aberto"** ao lado dos campos Valor mínimo/máximo em Contas a Pagar e Contas a Receber, e propagar `base_valor` para todas as requisições (listas, árvores, dashboards e exports).

## Alterações

### 1. `src/pages/ContasPagarPage.tsx` e `src/pages/ContasReceberPage.tsx`

- Adicionar `base_valor: 'original'` ao `initialFilters`.
- Adicionar um `<Select>` compacto (h-8) ao lado dos inputs `valor_min`/`valor_max`, com opções:
  - `original` → "Valor original" (default)
  - `aberto` → "Saldo em aberto"
- Só enviar `base_valor` no params quando `valor_min` ou `valor_max` estiver preenchido (evita ruído em requisições sem filtro de valor).
- Propagar `base_valor` nas chamadas de:
  - Lista (`/api/contas-pagar` / `/api/contas-receber`)
  - Árvore (`/api/contas-*-arvore`)
  - Dashboard (`/api/contas-*-dashboard`) — para reconciliar números quando o filtro é aplicado
  - Exports (detalhe, agrupado e árvore)
- Incluir `base_valor` no `exportParams` dos botões Exportar Excel.

### 2. Sem alteração em contratos/serviços

Os endpoints já aceitam parâmetros arbitrários via query string — não é necessário mudar `src/lib`.

## Fora de escopo

- Nenhuma alteração nos itens 1–4 e 6 do prompt (já implementados ou transparentes ao front).
- Nenhum ajuste em telemetria, permissões ou menus.