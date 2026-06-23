# Plano — Painel DRE Configurável (correção)

## Problema
A página `/bi/financeiro/dre-configuravel` chama `/api/dre/realizado/resumo`, que devolve totais fixos por prefixo de máscara e ignora `modelo_id`. Resultado: trocar o modelo não muda nada, e não há nenhuma configuração de fato. O nome "Configurável" está enganando o usuário.

## O que vai mudar

### 1. Trocar a fonte de dados do painel
- Remover o uso de `fetchDreRealizadoResumo` na página.
- Passar a usar `fetchDreDinamica` (já existe em `src/lib/bi/dreDinamicaApi.ts`), que chama:
  `GET /api/bi/contabilidade/dre-dinamica?anomes_ini=YYYYMM&anomes_fim=YYYYMM&modelo_id={id}`
- Conversão de `data_ini`/`data_fim` (YYYY-MM-DD) → `anomes_ini`/`anomes_fim` (YYYYMM) feita no client.
- Selecionar o modelo é obrigatório: enquanto não houver `modelo_id`, mostrar estado vazio com instrução ("Selecione um modelo DRE para carregar os dados").

### 2. Exibir a DRE dinâmica
- Substituir `DreResumoCards` + `DreMensalChart` + `DreMensalTable` por uma tabela hierárquica `DreDinamicaTable` que renderiza `dados: DreDinamicaLinha[]`:
  - coluna 1: `descricao` (indentada por `nivel`, negrito quando `flag_negrito`);
  - coluna 2: `realizado` formatado em moeda;
  - estilo por `tipo_linha` (TÍTULO/TOTAL em negrito; ANALÍTICA com link para abrir configuração da linha).
- Os "totais" topo passam a vir das linhas marcadas como TOTAL no retorno (não recalcular no front).

### 3. Estado "sem dados"
- Quando `dados.length === 0`, renderizar `NoDataState` com a mensagem exata:
  > "Sem lançamentos contábeis carregados em bi_vm_lanc_contabil para o período selecionado."

### 4. Configurador de vínculos (novo)
- Botão "Configurar linha" em cada linha da DRE (e botão geral "Configurar DRE") abre `DreConfigurarLinhaDialog`.
- Conteúdo do diálogo:
  - cabeçalho: linha selecionada (codigo_linha + descricao);
  - painel esquerdo: lista de contas/máscaras carregadas via novo client `fetchDreDinamicaPlanoContas` →
    `GET /api/bi/contabilidade/dre-dinamica/plano-contas?anomes_ini&anomes_fim&modelo_id&limit=10000`
    com busca por `cd_mascara` / `cd_conta_contabil` e checkbox por linha;
  - painel direito: contas já selecionadas na sessão atual;
  - rodapé: campos `operador` (default `COMECA_COM`), `sinal` (default `1`), `prioridade` (default `100`), `tipo_regra` fixado em `MASCARA_CONTA`;
  - botão **"Vincular contas"** → `postDreDinamicaVincularContas` chamando
    `POST /api/bi/contabilidade/dre-dinamica/vincular-contas`
    com payload:
    ```json
    {
      "modelo_id": "...",
      "linha_id": "...",
      "tipo_regra": "MASCARA_CONTA",
      "operador": "COMECA_COM",
      "sinal": 1,
      "prioridade": 100,
      "contas": [{ "cd_mascara": "411" }]
    }
    ```
- Após sucesso: toast + invalidar a query da DRE dinâmica para refletir os novos valores.

### 5. Limpeza / rótulos
- Renomear o título da página para "DRE Configurável" e o subtítulo para refletir que os valores vêm de `dre-dinamica` (sem prometer configuração quando não há).
- Marcar `dreConfiguravelApi.ts` (`fetchDreRealizadoResumo` + tipos `DreRealizadoResumo/Totais/MensalRow`) como deprecated — não usados mais por esta página. Sem remoção de arquivos para não quebrar imports residuais.

## Arquivos

### Novos
- `src/lib/bi/dreDinamicaConfigApi.ts` — `fetchDreDinamicaPlanoContas(...)` e `postDreDinamicaVincularContas(...)` usando `fetch` + `authHeaders` (mesmo padrão de `dreDinamicaApi.ts`).
- `src/components/bi/financeiro/DreDinamicaTable.tsx` — tabela hierárquica simples.
- `src/components/bi/financeiro/DreConfigurarLinhaDialog.tsx` — diálogo de vínculo.

### Editados
- `src/pages/bi/financeiro/DreConfiguravelPainelPage.tsx` — troca de query, novo render, integração com diálogo, estado vazio.
- `src/components/bi/financeiro/DreFiltrosBar.tsx` — `modelo_id` passa a ser obrigatório (label "Modelo *", validação no `onAplicar`). Demais filtros mantidos.
- `src/lib/bi/dreConfiguravelTypes.ts` — adicionar tipos `DreDinamicaPlanoContasItem` e `DreDinamicaVincularPayload` (manter os antigos).

### Não tocados
- `src/lib/bi/dreDinamicaApi.ts` (já correto).
- `DreConfiguracaoPage` (`/bi/contabilidade/dre/configuracao`) — fluxo separado, fora do escopo.

## Validação
1. Selecionar um modelo publicado → tabela renderiza linhas com valores ≠ 0 quando há dados.
2. Trocar para outro modelo → tabela muda (prova de que `modelo_id` é respeitado).
3. Período sem lançamentos → mensagem exata especificada.
4. Vincular máscara "411" a uma linha → request POST sai com payload acima, toast de sucesso, tabela recarrega e o valor da linha cresce.
5. 401 → mantém `ErrorState` "Sessão expirada".
