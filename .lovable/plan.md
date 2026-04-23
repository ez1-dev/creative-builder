

## Detalhar apontamentos de início/fim no padrão ERP (aba Movtos. O.P./O.S.)

### Objetivo
Adicionar à tela `/auditoria-apontamento-genius` um modo de **detalhe por movimento** (linha por apontamento bruto, como na aba "Movtos. O.P./O.S." do ERP Senior), exibindo no exemplo a OP **1005 / origem 110** com o registro:

```
Estágio  Oper.  Seq.Rot  Produto    Deriv  Equip  Operador            Qtde 1ª Qual  Data Início  H.Início  Data Fim   H.Fim  Tempo Bruto  Tempo Líq.  C.R.
2000     2100   10       110001333  U      2.941  ANDRE VALDECI CARV  24,00         06/03/2026   07:40     06/04/2026 08:09  13.349 min   13.349 min  2100
```

### Como será apresentado

**1) Drill-down "Detalhar apontamentos da OP"**
Na DataTable principal (agregada por OP), adicionar um botão de ação por linha → **"Ver movimentos"** (ícone `ListChecks`) que abre um `Sheet` lateral (já usado no projeto) com a grade de movimentos brutos daquela OP, no formato da imagem.

**2) Nova grade "Movimentos da OP" dentro do Sheet**
Colunas (na ordem do ERP):
- O.P./O.S. (`numero_op`)
- Estágio (`estagio` / `centro_trabalho`)
- Oper. (`codigo_operacao` / `operacao`)
- Seq.Rot (`seq_roteiro`)
- Produto/Serviço (`codigo_produto`)
- Derivação (`derivacao`) — se backend enviar
- Equipamento (`equipamento` / `codigo_equipamento`) — se backend enviar
- Operador (`numcad`)
- Nome Operador (`nome_operador`)
- Qtde 1ª Qual. (`qtde_primeira_qualidade` ou `quantidade`)
- Qtde Refug. (`qtde_refugo`)
- Qtde Inspec. (`qtde_inspecao`)
- Qtde 1ª/2ª/3ª Qual. Inic. — se vierem
- **Data Início** (`data_inicial`)
- **H.Início** (`hora_inicial`)
- **Data Fim** (`data_final`)
- **H.Fim** (`hora_final`)
- **Tempo Bruto (min.)** (`tempo_bruto_min` ou `horas_realizadas` em min)
- **Tempo Líq. (min.)** (`tempo_liquido_min` — fallback igual ao bruto)
- C.R. / Centro de Recurso (`centro_recurso` / `cod_recurso`)
- Status (badge: OK / SEM_INICIO / SEM_FIM / FIM<INI / >8h)

Cada coluna com `truncate + title` para não estourar; tabela com `overflow-x-auto` (padrão do `DataTable`).

**3) Acesso direto via filtros**
Acrescentar dois pontos de entrada para o detalhe:
- Botão **"Ver movimentos"** em cada linha agregada da grade principal.
- Quando o usuário filtrar `numop=1005` + `codori=110` + um período curto e o resultado tiver **só 1 OP**, a tela já abre o Sheet automaticamente nessa OP (atalho).

**4) Preenchimento dos dados**
Os movimentos brutos já vêm hoje em `dados[]` (cada linha do payload `/api/apontamentos-producao` é um movimento). O agregado por OP é feito no front. Vamos manter o agregado como visão padrão e usar as **mesmas linhas brutas filtradas pela OP escolhida** para popular o detalhe — **sem nova chamada à API**.

Mapeamento de campos novos (com fallback nulo se backend não enviar ainda):
- `derivacao` ← `r.derivacao`
- `equipamento` ← `r.equipamento ?? r.codigo_equipamento`
- `qtde_primeira_qualidade` ← `r.qtde_primeira_qualidade ?? r.quantidade ?? r.qtde`
- `qtde_refugo` ← `r.qtde_refugo`
- `qtde_inspecao` ← `r.qtde_inspecao`
- `tempo_bruto_min` ← `r.tempo_bruto_min ?? r.horas_realizadas` (já em min)
- `tempo_liquido_min` ← `r.tempo_liquido_min ?? r.tempo_bruto_min ?? r.horas_realizadas`
- `centro_recurso` ← `r.centro_recurso ?? r.cod_recurso ?? r.codigo_centro_trabalho`
- `seq_roteiro` ← `r.seq_roteiro ?? r.seqrot`

Esses fallbacks vão para o normalizador `normalizeRowApont`. Onde o backend não enviar, a célula mostra `—` (sem quebrar).

**5) Documentação para o backend**
Atualizar `docs/backend-auditoria-apontamento-genius.md` adicionando ao schema do item:
- `derivacao` (string)
- `equipamento` (string)
- `qtde_primeira_qualidade` / `qtde_refugo` / `qtde_inspecao` (number)
- `tempo_bruto_min` / `tempo_liquido_min` (number, em minutos)
- `centro_recurso` (string)

Com nota: "campos opcionais, frontend exibe '—' quando ausentes".

### Arquivos alterados
- `src/pages/AuditoriaApontamentoGeniusPage.tsx`
  - estender `normalizeRowApont` com novos campos
  - novo `Sheet` "Movimentos da OP {numop}" com `DataTable` no formato Movtos. O.P./O.S.
  - botão "Ver movimentos" em cada linha agregada
  - heurística: se filtro retornar 1 OP, abrir o Sheet automaticamente
- `docs/backend-auditoria-apontamento-genius.md`
  - documentar campos opcionais novos no payload

### Casos de teste
1. Filtrar `codori=110` + `numop=1005` + período cobrindo 06/03/2026 → 06/04/2026 → grade agregada mostra 1 OP → Sheet abre automaticamente com 1 linha: estágio 2000, operador 2100, ANDRE VALDECI CARV..., 06/03/2026 07:40 → 06/04/2026 08:09, 13.349 min.
2. Em outras OPs com vários apontamentos → botão "Ver movimentos" abre Sheet com N linhas detalhadas.
3. Backend sem os campos novos → colunas mostram `—`, sem quebrar render.
4. Apontamento `SEM_INICIO` / `SEM_FIM` → célula da hora vazia, badge de status na última coluna em vermelho.

### Fora de escopo
- Edição de apontamentos (tela é só consulta).
- Exportação Excel da nova grade (pode ser adicionada depois se solicitado).
- Calcular `tempo_liquido` no front quando não vier — assumimos que o backend já faz isso (igual ao ERP).

### Resultado
O usuário consegue, a partir da tela analítica de auditoria, ver **cada movimento individual** de uma OP no mesmo formato da aba "Movtos. O.P./O.S." do Senior, com data/hora de início e fim explícitos e tempos em minutos — replicando o que aparece na imagem para a OP 1005 / origem 110.

