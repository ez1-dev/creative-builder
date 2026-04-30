## Diagnóstico

A tela `/passagens-aereas/compartilhado` reutiliza o mesmo `PassagensDashboard.tsx`. O gráfico "Por Motivo de Viagem" já recebeu o fix de label em 2 linhas anteriormente, mas em motivos longos como **"TRANSFERENCIA DE OBRA"** (21 chars) e **"VIAGEM ADMINISTRATIVA"** (21 chars), o texto continua estourando para fora do `<svg>` do Recharts e é clipado pelo `overflow: hidden` padrão do SVG.

Causa técnica: `PieChart margin.right/left = 90px` reserva apenas 90px laterais dentro do SVG. Um nome com 21 chars a fontSize 11 ocupa ~135px — excede o espaço reservado e é cortado pela borda do SVG. A largura efetiva do card (em layout 2-colunas a 1364px) é ~430px, então o problema é estrutural, não cosmético.

Pelo print do usuário ainda aparecer no formato antigo de 1 linha (`SFERENCIA DE OBRA R$108 Mil (20,9%)`), parte do problema também é que o ajuste anterior pode não estar refletido no ambiente compartilhado que ele testou — mas mesmo com 2 linhas, "TRANSFERENCIA DE OBRA" sozinha ainda estouraria os 90px atuais.

## Solução

Endurecer o fix em `src/components/passagens/PassagensDashboard.tsx` (afeta automaticamente `/passagens-aereas` e `/passagens-aereas/compartilhado`):

1. **Permitir overflow no SVG do Recharts** para o gráfico de pizza, removendo o clip que corta as labels: aplicar `style={{ overflow: 'visible' }}` no `PieChart` (ou via CSS no `ResponsiveContainer` + selector `.recharts-surface { overflow: visible }`). Isso resolve o corte estrutural sem precisar reduzir mais o gráfico.

2. **Reduzir o limite de truncamento** de 24 → 18 caracteres como fallback, garantindo que mesmo sem `overflow:visible` o texto caiba (ex: "TRANSFERENCIA DE OB…").

3. **Diminuir o raio das labels** de `outerRadius + 22` para `outerRadius + 14`, encostando o texto mais perto da pizza e ganhando ~8px de cada lado.

4. **Reduzir `outerRadius` desktop** de 85 para 78, liberando mais espaço lateral para o texto sem reduzir a altura percebida do gráfico.

5. **Manter labels em 2 linhas** (nome em cima, valor + % embaixo) — já implementado.

A página de compartilhamento não precisa de mudanças: ela apenas renderiza o `PassagensDashboard` em modo `readOnly`, então herda o fix.

## Fora do escopo

- Não mexer em outros gráficos (Evolução, Top CC, Mapa).
- Não alterar layout mobile (continua com `%` dentro da fatia + legenda embaixo).
- Não alterar lógica de clique/seleção de fatias nem o "Ver detalhamento de Outros".