## Problema

Os KPIs do Painel de Compras não estão aparecendo porque todo o bloco (hero + cards gerenciais + detalhados) está dentro do guard `{data && kpis && (...)}` na linha 1013 de `src/pages/PainelComprasPage.tsx`. Como `kpis` agora só é populado quando o backend retorna `totais`/`resumo` no endpoint paginado, e o `kpisGerencial` vem de outra fonte (`dashboard`, do endpoint `/api/painel-compras-dashboard`), os cards gerenciais ficam ocultos mesmo quando o dashboard chega normalmente.

## Solução

Separar os dois grupos de KPIs em guards independentes, cada um amarrado à sua fonte real.

### `src/pages/PainelComprasPage.tsx`

1. **Hero + Qtd cards (linhas 1013-1086):** trocar o guard externo `{data && kpis && (` por `{data && kpisGerencial && (` e remover apenas o `</> ... )}` correspondente. Esses blocos só dependem de `kpisGerencial`.

2. **`<details>` "Indicadores Operacionais Detalhados" (linhas 1088-1125):** mover para fora do guard anterior e envolver com `{data && kpis && (...)}` próprio. Esse bloco depende de `kpis` (totais/resumo do paginado).

3. **Aviso amarelo "KPIs indisponíveis" (linha 1007):** ajustar para `{data && !kpis && !kpisGerencial && !loadingAgregado && (...)}` — só aparece quando NENHUMA das duas fontes voltou.

4. **`useAiPageContext` (linhas 248-261):** já está correto (usa dashboard com fallback para `data.resumo`). Sem alterações.

5. Sem mudanças em `kpis`, `kpisGerencial`, `gerencialActive` ou nas regras de cálculo — apenas o JSX é reorganizado.

## Efeito

- Quando `/api/painel-compras-dashboard` responder, os cards gerenciais (Total Comprado, Recebido vs Pendente, Qtd OCs/Itens/Fornecedores, Maior Fornecedor) aparecem mesmo se o paginado não trouxer `totais`/`resumo`.
- Quando o paginado trouxer `totais`/`resumo`, o painel "Indicadores Operacionais Detalhados" aparece mesmo se o dashboard falhar.
- O aviso "KPIs indisponíveis" só aparece se ambas as fontes falharem.
- Filtros gerenciais client-side continuam zerando KPIs (regra mantida da última iteração).
