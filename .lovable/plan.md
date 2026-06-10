## Objetivo
Melhorar a apresentação visual do bloco "Análise de Pareto 80/20" e traduzir todos os rótulos em inglês para português. Manter o gráfico ComposedChart como está; refinar apenas o cabeçalho, abas, resumo, listas inferiores e card de IA.

## Mudanças (apenas frontend)
Arquivo único: `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx` — função `ParetoBloco` e `ParetoSlideContent` (slide PPTX equivalente, se houver textos iguais).

### 1. Traduções
- "Vital few" → **"Principais (Poucos Vitais)"**
- "Useful many" → **"Demais (Cauda Longa)"**
- "% Acumulado" e "Faturamento" no gráfico: já estão em PT, manter.
- Título: "Análise de Pareto 80/20 — {Dimensão}" (já em PT).
- Mensagem do resumo: já está em PT, ajustar para usar singular/plural correto: "{N} cliente(s) (X% do total de {N}) concentram **Y%** do faturamento".

### 2. Rótulos de itens
Quando a dimensão for **Clientes**, o `cd_cliente` aparece sozinho (ex.: "8794"). Prefixar com "Cliente " → "Cliente 8794". Idem para Estados ("UF SP"), Obras ("Obra ...") quando o campo for vazio. Para Revendas manter o nome original.

Helper `formatLabel(dim, raw)`:
- cliente → `Cliente ${raw}`
- estado → `UF ${raw}`
- obra → `raw || '(sem projeto)'`
- revenda → `raw`

Aplicar tanto no eixo X do gráfico quanto na lista lateral.

### 3. Layout aprimorado dos blocos inferiores
Substituir as duas colunas atuais por:

**Coluna esquerda — "Principais (Poucos Vitais)"** com badge azul mostrando contagem.
- Cada linha vira um item com:
  - número de ranking circular (1, 2, 3…)
  - rótulo formatado, truncado
  - barra de progresso horizontal fina mostrando `pct` relativo ao primeiro item
  - valor em R$ alinhado à direita
  - pct individual em pílula (badge)
- Mostrar até 10 itens (em vez de 8), com "… +N itens" no final.

**Coluna direita — "Demais (Cauda Longa)"** com badge cinza:
- Card destacado mostrando:
  - "% do faturamento" como número grande (ex.: 13,2%)
  - valor em R$ logo abaixo
  - texto explicativo: "Oportunidade: desenvolver clientes da cauda longa para reduzir dependência dos {vitais} principais."
- Mini-indicador "Risco de concentração: ALTO/MÉDIO/BAIXO" baseado em pctVitaisFat:
  - ≥ 80% e vitais ≤ 5 → ALTO (badge destructive)
  - ≥ 70% → MÉDIO (badge warning)
  - < 70% → BAIXO (badge success)

### 4. Resumo superior aprimorado
Acima do gráfico, trocar o parágrafo de texto por uma faixa com 3 mini-KPIs:
- **Total de itens**: {items.length}
- **Concentração 80%**: {vitais} itens ({pctVitais.toFixed(1)}%)
- **% Faturamento (vitais)**: {pctVitaisFat.toFixed(1)}%

Cards leves com `border` e `bg-muted/30`, usando tokens semânticos do design system.

### 5. Card de Análise IA
Manter, mas:
- Renomear título "Análise IA — Concentração 80/20" → **"Insight da IA — Concentração 80/20"**
- Aumentar padding e melhorar contraste.

## Fora de escopo
- Não alterar API/backend nem buscar nomes de clientes (não há endpoint disponível para `nm_cliente` no payload atual).
- Não mexer no gráfico em si (cores, escalas, ReferenceLine 80% permanecem).
- Não tocar nos demais blocos do relatório.
- Não alterar o prompt da edge function de IA.

## Critérios de aceite
- Nenhum rótulo em inglês visível ("Vital few" / "Useful many" sumiram).
- Códigos de cliente aparecem com prefixo legível ("Cliente 8794").
- Lista esquerda mostra barras de progresso e ranking circular.
- Card direito destaca % e R$ da cauda longa com badge de risco.
- Faixa superior tem 3 mini-KPIs em vez de parágrafo corrido.
- Não gera React error #310. Mantém uso de tokens semânticos (sem cores hardcoded).