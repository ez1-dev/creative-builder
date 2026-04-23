

## Corrigir incoerência do card "Status OP Genius"

### Problema
No card "Status OP Genius" da tela `/auditoria-apontamento-genius`:

```
Status OP Genius        1.390
Período 22/04/2025      OPs ativas no período
→ 22/04/2026

[barra azul 26%][barra cinza 74%]

● 368 em andamento (26%)   ● 1.022 finalizadas (74%)   ⚠ 100 com discrepância
```

Dois problemas:

1. **Rótulo do número grande está errado**: 1.390 é apresentado como "OPs ativas no período", mas o cálculo é `opsEmAndamento + opsFinalizadas` — inclui finalizadas. Pelo padrão da própria página (`STATUS_OP_ATIVOS = {E, L, A}` vs `STATUS_OP_FINALIZADOS = {F}`), "ativas" são apenas as **368 em andamento**, não as 1.390.

2. **Barra não reflete "discrepâncias"**: a barra tem só dois segmentos (andamento + finalizadas) e ignora as 100 com discrepância. O usuário vê o número de discrepância no rodapé sem nenhum correspondente visual na barra.

### Solução

**Arquivo único alterado:** `src/pages/AuditoriaApontamentoGeniusPage.tsx` — componente `StatusOpGeniusCard` (linhas 1732–1806).

#### 1) Corrigir o rótulo do total
Trocar `"OPs ativas no período"` por `"OPs no período"` (já que o número soma ativas + finalizadas).
Reservar a palavra "ativas" para o segmento azul (368), que é o que de fato representa "em andamento / ativas".

Layout final do cabeçalho:
```
Status OP Genius                    1.390
Período 22/04/2025 → 22/04/2026     OPs no período
                                    (368 ativas + 1.022 finalizadas)
```

#### 2) Tornar a barra fiel ao que está sendo exibido
A barra continua segmentada por status (andamento vs finalizadas), porque é a divisão principal. A discrepância **vira um marcador sobreposto** (faixa vermelha tracejada na parte inferior da barra) proporcional ao % de discrepâncias sobre o total, com tooltip "100 OPs com discrepância (7%)".

Estrutura visual:
```
[████████ andamento 26% ████████][░░░░░ finalizadas 74% ░░░░░]
[ ▓▓▓▓ discrepâncias (faixa vermelha tracejada cobrindo 7% à esquerda) ▓▓▓▓ ]
```

Isso mantém a barra coerente com os 3 valores listados embaixo (andamento, finalizadas, discrepância) sem quebrar a leitura principal.

#### 3) Tooltips e acessibilidade
- Tooltip nos segmentos com valor absoluto + %.
- `aria-label` no container da barra: "Distribuição: 368 em andamento, 1.022 finalizadas, 100 com discrepância de um total de 1.390 OPs".

#### 4) Validação visual
- Caso `totalDiscrepancias === 0`, não renderizar a faixa de discrepância (manter só os 2 segmentos).
- Caso `opsEmAndamento === 0` ou `opsFinalizadas === 0`, a barra continua mostrando 100% do segmento existente (sem divisão por zero — já tratado pelo guard `totalOps === 0` que retorna null).

### Casos de teste manuais
1. Tela atual (368 / 1.022 / 100) → cabeçalho mostra **1.390 OPs no período** com subtítulo "(368 ativas + 1.022 finalizadas)"; barra com 2 segmentos + faixa vermelha tracejada cobrindo ~7%.
2. Filtrar `status_op = FINALIZADO` → barra fica 100% cinza, número grande = total finalizadas, sem rótulo enganoso de "ativas".
3. Período sem discrepância → faixa vermelha some, barra continua com 2 cores.
4. Hover na barra → tooltips com valores absolutos e %.

### Fora de escopo
- Recalcular agregados no backend (os números 368/1.022/100 vêm do `resumo` da API e estão corretos — só o **rótulo** estava errado).
- Mudar cores da paleta global.

### Resultado
O card passa a representar fielmente o que o usuário lê: o número grande deixa de ser chamado de "ativas" (já que inclui finalizadas), e a barra ganha o terceiro indicador (discrepância) que hoje aparece só no rodapé.

