Refazer rótulos enriquecidos da Pizza/Rosca em `src/components/bi/charts/PieChartCard.tsx`:

1. Voltar `outerRadius` para ~88 (donut inner 54) — pizza grande de novo.
2. Posicionar labels próximos ao cotovelo (não nas bordas do card): `labelX = elbowX ± 10`, com `text-anchor` por lado.
3. Reservar largura de texto ~110px de cada lado; pizza centralizada no espaço restante.
4. Anti-colisão mantida (push down + push up por lado).
5. Leader line em 3 segmentos: borda da fatia → cotovelo → trecho horizontal curto até o texto.
6. Fatias < 2% mostram só `valor (%)` (sem nome) para reduzir altura do bloco e evitar empilhamento.
7. Sem mudanças em outros componentes.

Aceite: pizza grande, labels legíveis perto das fatias, sem sobreposição, leader lines curtas.