

## Detalhamento de movimentos da OP com data/hora início e fim + horas apontadas

### Diagnóstico
Hoje, ao clicar numa OP dentro do `KpiDeepSheet` (ou no drawer de OP), o accordion `OpLinhasInline` lista os apontamentos brutos, mas não exibe de forma clara, por linha de movimento:
- **Data início** + **Hora início**
- **Data fim** + **Hora fim**
- **Tempo apontado** (em min e h)

A informação existe nos campos `data_inicial`, `hora_inicial`, `data_final`, `hora_final`, `horas_realizadas` (em minutos) já presentes em `RowApont`, mas a tabela atual exibe colunas resumidas e não destaca o par data+hora de início/fim.

### Mudanças (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Reformatar o componente `OpLinhasInline`**

Substituir/expandir as colunas atuais para deixar explícito o ciclo do movimento. Nova ordem de colunas:

| # | Operação | Operador | Centro Trab. | **Início (data + hora)** | **Fim (data + hora)** | **Apontado (min · h)** | Total Dia Op. | Status | Ações |
|---|----------|----------|--------------|--------------------------|-----------------------|------------------------|---------------|--------|-------|

- **Início**: renderizar `formatDate(data_inicial)` + `hora_inicial` em duas linhas (data em cima, hora abaixo em `text-xs text-muted-foreground`). Se faltar `hora_inicial`, mostrar badge `Sem início` em vermelho.
- **Fim**: idem para `data_final` + `hora_final`. Se faltar `hora_final`, badge `Sem fim`. Se `hora_final < hora_inicial` (mesmo dia), badge `Fim < Início`.
- **Apontado**: `{horas_realizadas} min · {minToHours(horas_realizadas).toFixed(2)} h`. Destaque amarelo quando `> 0 && < 5` (regra do KPI novo) e destaque vermelho quando `> 480` (>8h).
- **Total Dia Op.**: `{total_horas_dia_operador} min · {h} h`, destaque vermelho se `> 480`.

**2. Linha-resumo no topo do accordion expandido**

Acima da tabela de movimentos, adicionar um bloco compacto com o resumo da OP:
- Período coberto: `menor(data_inicial)` → `maior(data_final ?? data_inicial)`
- Total apontado da OP: soma de `horas_realizadas` em min e h
- Nº de movimentos / nº de operadores únicos / nº de centros de trabalho únicos
- Quantidade de movimentos com inconsistência (qualquer regra)

**3. Ordenação default dos movimentos**

Ordenar por `data_inicial` asc + `hora_inicial` asc para o usuário ver a linha do tempo da OP. Manter possibilidade de clicar nos cabeçalhos para reordenar (já suportado pelo `DataTable` se for o caso; senão, ordenar manualmente no array antes de renderizar).

**4. Mesmas mudanças no drawer "Abrir drawer OP"**

O drawer dedicado de OP (acionado pelo botão "Abrir drawer OP") usa o mesmo dataset — aplicar exatamente a mesma estrutura de colunas e bloco-resumo para manter consistência.

**5. Realce visual por status**

Cada `<tr>` de movimento ganha `rowClassName` com fundo:
- `bg-amber-500/10` quando `> 0 && < 5min`
- `bg-red-500/10` quando `> 8h` (apontamento ou total dia)
- `bg-orange-500/10` quando `Sem início` / `Sem fim` / `Fim < Início`
- Sem cor quando consistente

### Fora de escopo
- Adicionar gráfico Gantt da OP.
- Mudar contrato de backend.
- Persistir ordenação preferida do usuário.

### Resultado
Ao expandir/abrir uma OP a partir de qualquer KPI ou da tabela principal, o usuário vê a linha do tempo dos movimentos com **data e hora de início**, **data e hora de fim** e **tempo apontado** (min e h) por linha, mais um cabeçalho-resumo da OP, com destaques visuais de inconsistência.

