## Contexto

Validação contra o relatório oficial **FPRF001 (Relação de Cálculo)** — competência 202606, empresa 1 — confirmou:

- **Proventos 2.360.315,61** bate exato (tipeve 1+2).
- **Líquido atual 1.064.077,31** subtrai `tipeve=3` inteiro (inclui evento 264 "Líquido Rescisão", codclc=13). Decisão do usuário: **manter como está**.
- **Salário Base 1.660.337,57** = salário nominal mensal por colaborador (horista = taxa/h × horas contratuais R016; mensalista = salemp). Decisão: **manter como referência oficial**.
- **INSS Patronal 410.641,63** = 20% × base INSS `R046INF.basins` (não é evento). Card já existe.

Como os números já batem com a fonte da verdade, a mudança é apenas **explicativa**: hoje o usuário não sabe *o que compõe* cada card e por que o líquido difere do "proventos − descontos".

## O que vai mudar (frontend only)

### 1. `src/pages/rh/ResumoFolhaPage.tsx` — tooltips e legendas

Enriquecer os tooltips (`Info` icon) dos 4 cards principais com a metodologia validada:

- **Proventos**: "Soma de eventos com `tipeve ∈ {1,2}` — proventos base + benefícios. Bate com FPRF001."
- **Descontos**: "Soma de `tipeve = 3` — inclui INSS, IRRF, consignados, adiantamentos e o evento 264 (Líquido Rescisão, pago à parte)."
- **Líquido**: "Proventos − Descontos (tipeve=3 inteiro). Inclui o evento 264 (Líquido Rescisão) como saída, já que a rescisão é paga separadamente."
- **Salário Base**: "Salário nominal mensal por colaborador (horista = taxa/h × horas contratuais; mensalista = salemp)."
- **INSS Patronal**: já explicado no card; manter.

### 2. `src/pages/rh/ResumoFolhaPage.tsx` — badge "Validado FPRF001"

Adicionar um pequeno badge discreto no cabeçalho da página (ao lado do título ou do seletor de período) com tooltip:

> "Metodologia conferida contra o relatório oficial Senior **FPRF001 - Relação de Cálculo** em 23/07/2026 (competência 202606)."

Sinaliza confiabilidade sem poluir a UI.

### 3. `ResumoFolhaDrillDrawer.tsx` — nota no drill Analítico

No nível **Analítico** (evento × colaborador), adicionar uma nota discreta no rodapé do drawer:

> "Este drill reproduz a mesma classificação do FPRF001 (evento pela classe `codclc`/`tipeve`). O total é somado antes do corte da lista, então fecha mesmo quando truncado em 5.000 linhas."

## Fora de escopo

- Nenhuma alteração em cálculo, endpoint ou fórmula: os números já estão corretos.
- Nenhuma alteração no backend FastAPI.
- Não vamos mexer no evento 264 nem separar rescisão em card próprio (decisão do usuário: manter como está).

## Detalhes técnicos

Arquivos a editar:

```text
src/pages/rh/ResumoFolhaPage.tsx           # tooltips dos cards + badge FPRF001
src/components/rh/ResumoFolhaDrillDrawer.tsx  # nota metodológica no drill analítico
```

Nenhum novo componente, hook, tipo ou dependência. Nenhuma migração.
