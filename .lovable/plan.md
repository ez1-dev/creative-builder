# Corrigir colunas trocadas na tabela "Registros"

## Diagnóstico

Na tabela de Registros do dashboard, os cabeçalhos são:

`Data | Colaborador | C. Custo | Motivo da Viagem | Origem → Destino | Tipo | Valor`

Mas as células renderizam (em `PassagensDashboard.tsx`):

- coluna **Motivo da Viagem** → mostra `tipo_despesa` (ex.: "Aéreo")
- coluna **Tipo** → mostra `cia_aerea` (ex.: "AZUL LINHAS AEREAS", "LATAM")

Por isso na tela aparece "Aéreo" debaixo de Motivo e "LATAM" debaixo de Tipo. O dado no banco está correto — só a renderização está trocada.

## Correção

Em `src/components/passagens/PassagensDashboard.tsx`, nos dois blocos da tabela (linhas ~1083–1100 agrupado por colaborador e ~1104–1120 lista plana), trocar o conteúdo das células 3 e 5 para casar com os cabeçalhos:

- Coluna **Motivo da Viagem** → `r.motivo_viagem ?? '-'`
- Coluna **Tipo** → `r.tipo_despesa` (mantém o tipo: Aéreo / Ônibus / Outros)

A coluna Cia Aérea continua não aparecendo nessa tabela (já não estava no header). Quem quiser ver a Cia, ela aparece nos badges de detalhe e nos exports.

Nenhuma mudança de banco — apenas o frontend.
