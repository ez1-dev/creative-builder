## Objetivo
Fazer as três abas de Estoque (Consulta, Curva ABC, Baixo Giro) exibirem corretamente Produto, Descrição, Depósito e demais indicadores usando o payload real do endpoint `/api/estoque/analise`.

## Diagnóstico confirmado
Resposta observada em `GET /api/estoque/analise` traz cada item com as chaves:
`codigo, descricao, familia, tipo, unidade_medida, derivacao, deposito, saldo, custo_medio, valor_estoque, consumo_qtd, consumo_valor, saidas_periodo, ultima_saida, dias_sem_saida, cobertura_meses, giro, sem_saida_registrada, tipo_descricao, abc_posicao, abc_pct_acumulado, curva_abc`.

O código atual (`src/lib/estoque/analiseApi.ts` + abas) espera `codpro / despro / coddep / codder / consumo_quantidade / faixa_aging` — daí "—" em Produto e Descrição, e KPIs zerados.

Campos que o backend **não** envia hoje e o front assume: `desdep, desder, reservado, disponivel, a_receber, ops_reservando, proxima_entrega, projetado, faixa_aging`, e o objeto `resumo` (`valor_total_estoque, consumo_periodo_valor, itens_curva_a/b/c, itens_sem_consumo, capital_parado_12m/24m, itens_sem_saida, aging{...}`).

## Escopo (só frontend — não recalcular ABC/Giro; apenas normalizar e fallback visual)

### 1. `src/lib/estoque/analiseApi.ts`
- Adicionar camada de normalização em `getEstoqueAnalise` que mapeia por item, preservando campos originais e expondo aliases usados pelas abas:
  - `codpro ← codigo`
  - `despro ← descricao`
  - `coddep ← deposito`; `desdep ← deposito` (fallback até backend enviar descrição)
  - `codder ← derivacao`; `desder ← derivacao`
  - `codfam ← familia`
  - `consumo_quantidade ← consumo_qtd`
- Não inventar valores para `reservado / disponivel / a_receber / ops_reservando / proxima_entrega / projetado` — deixar `null` e o render já cai em "—".
- Ajustar `faixaAging(item)` para também considerar `sem_saida_registrada === true` como `sem_saida` antes do fallback por `dias_sem_saida`.
- `isSemConsumo` usar `consumo_qtd ?? consumo_quantidade`.

### 2. Resumo (KPIs)
- Como o backend não envia `resumo`, calcular no cliente **somente agregações triviais de exibição** (soma de `valor_estoque`, contagem por `curva_abc`, contagem `sem_consumo`, buckets de aging) — nada de recomputar ABC/Giro/Cobertura. Deixar comentário indicando "fallback de exibição enquanto backend não envia `resumo`".
- Manter prioridade em `resumo?.campo` quando existir (para o dia em que o backend passar a enviar).

### 3. Abas
- `ConsultaTab.tsx`, `CurvaAbcTab.tsx`, `BaixoGiroTab.tsx`: nenhuma mudança de layout. Apenas confirmar que continuam lendo `r.codpro / r.despro / r.coddep / r.consumo_quantidade` (que agora existem via alias) e que colunas opcionais (Reservado, Disponível, A receber, Próxima entrega, Projetado) exibem "—" graciosamente quando o backend não enviar.

### 4. Observação para o usuário
- Nada de mudar contrato do backend agora. Se ele passar a devolver `desdep`, `reservado`, `resumo{...}`, os aliases continuam válidos (fallback só se aplica quando o campo original falta).

## Fora do escopo
- Alterar endpoint, layout das abas, exportações ou lógica de ABC/Giro.
- Adicionar novos filtros ou colunas além dos já previstos.

## Verificação
Após implementar, recarregar `/estoque?aba=baixo-giro` e `/estoque?aba=curva-abc`, confirmar que Produto/Descrição/Depósito aparecem preenchidos e que KPIs deixam de ficar zerados.
