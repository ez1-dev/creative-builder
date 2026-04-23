

## Verificação do contrato backend — Auditoria Apontamento Genius

### Status atual da documentação `docs/backend-auditoria-apontamento-genius.md`

A documentação está **completa e alinhada** com o que o frontend espera. Resumo do que está documentado:

**1) Origens GENIUS fixas (filtro obrigatório)**
`110, 120, 130, 135, 140, 150, 205, 208, 210, 220, 230, 235, 240, 245, 250` — backend deve sempre filtrar mesmo quando `codori` não vier.

**2) Status nativos da OP (E900COP)**
`E/L/A` = ativa · `F` = finalizada · `C` = cancelada · `SEM_STATUS` quando faltar.

**3) Bloco `debug` obrigatório enquanto resultados vierem vazios**
Inclui `sql_final`, `parametros`, `etapas[]` (movimentos no período → origens GENIUS → join E900COP → por status), `contagem_por_origem`, `contagem_por_status_op`, `contagem_por_op`, `apontamentos_por_op`.

**4) Endpoint `GET /api/auditoria-apontamento-genius`**
Query params, response JSON com `dados[]` + `resumo` + status enum (OK / SEM_INICIO / SEM_FIM / FIM_MENOR_INICIO / APONTAMENTO_MAIOR_8H / OPERADOR_MAIOR_8H_DIA), modelos Pydantic e SQL exemplo (T-SQL Senior usando E660APO + E215OPE + E075PRO).

**5) Endpoint `GET /api/export/auditoria-apontamento-genius`** — XLSX com mesmos filtros.

**6) Campos opcionais "Movtos. O.P./O.S." (já documentados na última iteração)**
`derivacao`, `equipamento`, `qtde_primeira_qualidade`, `qtde_refugo`, `qtde_inspecao`, `tempo_bruto_min`, `tempo_liquido_min`, `centro_recurso`, `data_inicial`/`hora_inicial`, `data_final`/`hora_final` — frontend mostra `—` quando ausentes.

### Inconsistências/lacunas detectadas que precisam de pequena correção no doc

Comparando o doc com o que o frontend já consome em `src/lib/api.ts` (`AuditoriaApontamentoGeniusResponse.resumo`):

1. **Falta documentar campos novos do `resumo`** que o frontend já lê:
   - `total_ops_andamento` / `total_ops_finalizadas` (alias novos para `ops_em_andamento` / `ops_finalizadas`)
   - `total_sem_inicio` / `total_sem_fim` / `total_fim_menor_inicio`
   - `total_apontamento_maior_8h` / `total_operador_maior_8h_dia`
   - `ops_canceladas` / `ops_sem_status`
   
   Hoje o doc só lista os nomes antigos (`sem_inicio`, `acima_8h`, etc.). Manter ambos como aceitos, mas marcar os `total_*` como preferidos.

2. **Status `status_op` no item**: o doc mostra exemplo só com `EM_ANDAMENTO`/`FINALIZADO`, mas o frontend (e o próprio doc na seção "Status nativos") aceita também `E/L/A/F/C/SEM_STATUS`. Atualizar exemplo JSON e o `Pydantic` para refletir o enum nativo como preferido.

3. **Filtro `status_op`**: o doc aceita só `EM_ANDAMENTO`/`FINALIZADO`. Adicionar valores nativos `E`, `L`, `A`, `F`, `C` como aceitos no query param.

4. **Bloco "Campos opcionais Movtos. O.P./O.S."**: já está, mas falta acrescentar `seq_roteiro` como preferido sobre `seqrot` e citar fallbacks que o frontend faz (`equipamento ?? codigo_equipamento`, `centro_recurso ?? cod_recurso ?? codigo_centro_trabalho`).

### Ações a aplicar (somente no `.md` — sem mudança de código frontend)

Editar `docs/backend-auditoria-apontamento-genius.md`:

- **Seção `### Response`** — atualizar exemplo JSON do item para usar `status_op: "A"` e adicionar bloco `resumo` completo com os campos `total_*` novos, mantendo os legados como aliases.
- **Seção `### Pydantic`** — atualizar `ApontamentoGeniusItem.status_op` para aceitar `E/L/A/F/C/SEM_STATUS` e estender `ResumoApontGenius` com os campos `total_ops_andamento`, `total_ops_finalizadas`, `total_sem_inicio`, `total_sem_fim`, `total_fim_menor_inicio`, `total_apontamento_maior_8h`, `total_operador_maior_8h_dia`, `ops_canceladas`, `ops_sem_status`.
- **Seção `### Query params`** — incluir na descrição do `status_op` que aceita também `E/L/A/F/C`.
- **Seção `### Campos opcionais — formato ERP "Movtos. O.P./O.S."`** — adicionar nota com a tabela de fallbacks que o frontend aplica em `normalizeRowApont` (para o backend saber que pode mandar qualquer um dos nomes).
- **Seção `### Checklist de validação`** — adicionar 3 itens:
  - [ ] `resumo` retorna os campos `total_*` (preferidos) além dos legados.
  - [ ] `status_op` no item usa códigos nativos (`E/L/A/F/C`) quando possível.
  - [ ] Bloco `debug` continua sendo retornado enquanto a investigação estiver ativa (até confirmação explícita de que pode ser removido).

### Arquivos alterados
- `docs/backend-auditoria-apontamento-genius.md` (única alteração — o frontend já está pronto para receber os campos atualizados)

### Fora de escopo
- Mudar código do frontend (já está alinhado e tolerante a payloads parciais).
- Implementar o backend em si — o doc é apenas o contrato.
- Remover o bloco `debug` (deve permanecer até a investigação dos resultados vazios concluir).

### Resultado
A documentação backend passa a refletir exatamente os campos que o frontend já consome (incluindo os aliases `total_*` do `resumo`, status nativo da OP em uma letra, e fallbacks dos campos opcionais de "Movtos. O.P./O.S."), eliminando ambiguidade para quem for implementar o endpoint no FastAPI.

