# Módulo Estoque — 3 abas com motor único de análise

## Objetivo

Transformar a página atual `/estoque` em um módulo com três abas (**Consulta**, **Curva ABC**, **Baixo Giro**) mantendo a Consulta como está hoje e adicionando duas novas abas que consomem exclusivamente `GET /api/estoque/analise`. Sem cálculo de ABC, giro, cobertura, aging, última saída ou custo médio no frontend.

## Estrutura de arquivos

Criar:
- `src/lib/estoque/analiseApi.ts` — tipos `EstoqueAnaliseItem`, `EstoqueAnaliseResumo`, `EstoqueAnaliseResponse` + função `getEstoqueAnalise(params)`.
- `src/hooks/estoque/useEstoqueAnalise.ts` — React Query com cache/cancelamento por `[codemp, codfil, criterio_abc, meses_consumo, corte_a, corte_b, filtros]`.
- `src/pages/estoque/tabs/ConsultaTab.tsx` — recebe o corpo atual de `EstoquePage.tsx` sem mudanças de regra.
- `src/pages/estoque/tabs/CurvaAbcTab.tsx`
- `src/pages/estoque/tabs/BaixoGiroTab.tsx`
- `src/pages/estoque/components/AnaliseItemDrawer.tsx` — drawer de detalhes compartilhado (só apresentação).
- `src/pages/estoque/components/AnaliseFiltrosHeader.tsx` — Empresa, Filial, Meses, Critério ABC, Cortes A/B, painel "Critérios da análise" (`response.observacoes`).
- `src/pages/estoque/exportAnalise.ts` — helpers XLSX/CSV/PDF reaproveitando padrões existentes; cabeçalho com Empresa, Filial, Critério, Meses, Cortes A/B, Data.

Alterar:
- `src/pages/EstoquePage.tsx` — vira shell com `<Tabs>` controlado pela URL (`?aba=consulta|abc|baixo-giro`) e monta `ConsultaTab` / `CurvaAbcTab` / `BaixoGiroTab`. Nenhuma lógica de negócio adicional aqui.
- `src/config/menuCatalog.ts` — nenhuma nova rota; a página permanece em `/estoque`.

## Contrato consumido (somente leitura defensiva)

```
GET /api/estoque/analise
  ?codemp&codfil&meses_consumo&criterio_abc(CONSUMO|VALOR_ESTOQUE)
  &corte_a&corte_b
```
Retorno esperado: `{ dados: EstoqueAnaliseItem[], resumo, observacoes, meta? }`. O front lê `item.curva_abc`, `item.abc_pct_acumulado`, `item.ultima_saida`, `item.dias_sem_saida`, `item.cobertura_meses`, `item.consumo_valor`, `item.valor_estoque`, `item.custo_medio`, `item.saldo`, `item.reservado`, `item.disponivel`, `item.a_receber`, `item.projetado`, `item.proxima_entrega`, `item.ops_reservando`. Nunca deriva ABC, giro, cobertura, aging, última saída, valor de estoque ou consumo. `E210EST.CURABC` e `E210EST.DATUSA` não são lidos.

Sem consumo é categoria própria (`curva_abc == null` ou flag equivalente do backend) — nunca é tratado como C. Soma exibida: `A + B + C + Sem consumo = universo`; se não fechar, banner de aviso, sem correção local.

## Aba Consulta

Move o conteúdo atual de `EstoquePage.tsx` (saldo físico, reservas de OP, a receber, projetado, badges "Falta sem compra / Compra cobre a falta / Compra insuficiente") para `ConsultaTab.tsx`. Nenhuma alteração funcional.

## Aba Curva ABC

Header: Empresa (herda), Filial, **Período de consumo** (3/6/12/18/24, default 12), **Critério** (`Consumo no período` | `Valor atual em estoque`), avançado com **Cortes A/B** (validar `0 < corte_a < corte_b ≤ 100`).

Cards (de `response.resumo`): Valor total do estoque, Consumo no período, Itens A, Itens B, Itens C, Itens sem consumo, Valor em itens sem consumo.

Grid: Curva (badge A/B/C/Sem consumo), Produto, Descrição, Derivação, Depósito, Saldo, Custo médio, Valor em estoque, Consumo no período, % acumulado, Giro, Cobertura, Última saída, Dias sem saída, Reservado, A receber, Projetado. Ordenação padrão pelo `abc_pct_acumulado` (ou ordem do backend).

Resumo A/B/C/Sem consumo em mini-tabela usando números da API.

## Aba Baixo Giro

Mesmo endpoint com mesmos filtros globais. Cards: Valor total, Capital parado >12m, Capital parado >24m, Itens sem saída, Valor sem saída, Itens com compra chegando + baixo giro (todos vindos de `resumo`).

Faixas de aging separadas: `0-6 / 6-12 / 12-24 / 24+ / Sem saída registrada` (nunca fundir 24+ com Sem saída).

Grid com colunas: Produto, Descrição, Derivação, Depósito, Saldo, Valor em estoque, Última saída, Dias sem saída, Faixa de aging, Consumo, Giro, Cobertura, Curva ABC, Reservado em OP, A receber, Próxima entrega, Projetado, Situação.

Ordenações: Mais dias sem saída, Maior valor parado, Maior cobertura, Menor giro, Maior compra pendente. Filtros: Faixa de aging, Curva ABC, Somente sem consumo, Somente com saldo, Somente com reserva, Somente com compra pendente, Somente com compra chegando, Cobertura > N meses, Valor > R$ X. Filtros suportados pelo backend vão via query; os demais aplicados sobre o dataset completo (não sobre página).

Filtros rápidos cruzados: "Oportunidades de redução", "Compras de item sem giro", "Capital parado", "Itens críticos para produção" — combinam campos já retornados.

Badges de criticidade reutilizam os já usados na Consulta (Falta sem compra / Compra cobre / Compra insuficiente) mais Sem saída com estoque, Baixo giro + compra pendente, C + alto valor, Cobertura elevada.

## Drawer de detalhes

Mostra todos os campos do item + notas explicativas fixas para Giro e Cobertura ("conforme regra do backend"). Cobertura formatada `1,2 meses / 24+ meses / Sem consumo` (nunca `Infinity`). Sem cálculos locais.

## URL, estado e desempenho

Query string persiste `aba, criterio_abc, meses_consumo, corte_a, corte_b, aging, curva`. Trocar empresa/filial limpa dados anteriores (`queryClient.removeQueries`). React Query com `keepPreviousData`, `cancelQueries` ao mudar filtros, skeleton, debounce nas buscas de texto, paginação/virtualização na grid (`@tanstack/react-virtual` já usado em outros pontos, senão paginação client-side sobre o dataset completo).

## Exportações

XLSX/CSV/PDF em cada aba com cabeçalho contextual (Critério ABC, Meses, Cortes, Empresa, Filial, Data) e todas as colunas da grid respectiva. Sem consumo permanece como categoria própria no export.

## Fora de escopo

Backend, cálculo de ABC/giro/cobertura/aging, alteração da aba Consulta, novas rotas, novos endpoints. `CURABC` e `DATUSA` continuam ignorados.

## Validação (checklist)

- Alternar Consumo ⇄ Valor em estoque refaz request e atualiza `curva_abc` + `abc_pct_acumulado`.
- Ambas as medidas (`consumo_valor` e `valor_estoque`) visíveis simultaneamente.
- Sem consumo separado de C; soma A+B+C+Sem consumo bate com universo.
- Baixo Giro usa `ultima_saida` real; `DATUSA`/`CURABC` ausentes do código.
- `9999999*` não reintroduzido; `response.observacoes` exibido.
- Consulta segue mostrando reservas/compras.
- Ambas as novas abas chamam o mesmo endpoint com a mesma query key.
- Export respeita filtros ativos e categoria Sem consumo.
- Cobertura nunca renderiza `Infinity`.
