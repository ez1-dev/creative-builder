## Objetivo

Registrar o relatório já existente **RELAPROP – Impressão de Ordem de Produção** no catálogo do módulo *Desenvolvimento de Relatórios* (`/relatorios/desenvolvimento`). Ele não é SQL: consome `/api/producao/ordem-producao/impressao` do FastAPI e renderiza cabeçalho + componentes + operações + desenhos na tela `/producao/impressao-ordem-producao`.

A entrada serve como **modelo de documentação** (parâmetros, colunas/campos por dataset) para futuros relatórios não-SQL — sem aba de SQL, sem Pré-visualização, em modo leitura.

---

## O que muda

### 1. Banco (migração)

Tabela `relatorios` ganha 3 colunas opcionais:

- `tipo_fonte` text NOT NULL DEFAULT `'sql'` — valores aceitos: `sql` | `api_rest`.
- `endpoint_url` text NULL — endpoint do FastAPI (quando `api_rest`).
- `url_destino` text NULL — rota interna a abrir no botão "Abrir relatório".

Inserção do registro RELAPROP:

- `codigo` = `RELAPROP`
- `nome` = `Impressão de Ordem de Produção`
- `modulo` = `Produção`
- `categoria` = `Operacional`
- `fonte_dados` = `ERP Senior (FastAPI)`
- `tipo_fonte` = `api_rest`
- `endpoint_url` = `/api/producao/ordem-producao/impressao`
- `url_destino` = `/producao/impressao-ordem-producao`
- `sql_query` = `''`
- `status` = `publicado`
- `permite_excel/pdf/csv` = `false` (exportações nativas do módulo não se aplicam — a tela tem impressão própria)

Inserção em `relatorio_parametros` (espelho dos filtros de `ImpressaoOpFiltros`):

`cod_emp` (numero, obrig), `cod_ori` (texto, obrig), `num_orp` (numero, obrig), `num_ped`, `rel_prd`, `sit_orp`, `cod_pro`, `listar_componentes` (lista S/N – padrão S), `listar_desenho` (lista S/N – padrão N), `cod_etg`, `cod_cre`, `incluir_desenhos` (lista S/N), `quebrar_por_operacao` (lista S/N).

Inserção em `relatorio_colunas` documentando os 3 datasets (prefixo no `campo`):

- **Cabeçalho**: `cabecalho.num_orp_formatado`, `cabecalho.produto`, `cabecalho.descricao_produto`, `cabecalho.unidade_medida`, `cabecalho.quantidade`, `cabecalho.pedido`, `cabecalho.inicio_previsto`, `cabecalho.periodo`, `cabecalho.situacao_descricao`, `cabecalho.revisao`, `cabecalho.codigo_barras_op`.
- **Componentes**: `componentes.codigo_componente`, `componentes.descricao_componente`, `componentes.quantidade_prevista` (numero), `componentes.unidade_medida`, `componentes.deposito`, `componentes.endereco`, `componentes.cod_etg`, `componentes.seq_cmp`, `componentes.codigo_barras_componente`.
- **Operações**: `operacoes.cod_etg`, `operacoes.descricao_estagio`, `operacoes.seq_rot`, `operacoes.cod_cre`, `operacoes.descricao_centro_recurso`, `operacoes.cod_opr`, `operacoes.descricao_operacao`, `operacoes.fornecedor`, `operacoes.servico`, `operacoes.descricao_servico`, `operacoes.tmp_unit` (numero), `operacoes.tmp_total` (numero), `operacoes.unidade_medida`, `operacoes.proxima_operacao_label`, `operacoes.codigo_barras_operacao`, `operacoes.narrativas`.

Inserção em `relatorio_layout` com `tipo='tabela_simples'`, título "Impressão de Ordem de Produção", subtítulo descritivo.

### 2. Frontend

- `src/lib/relatorios/types.ts`: adicionar `tipo_fonte: 'sql' | 'api_rest'`, `endpoint_url`, `url_destino` em `Relatorio`.
- `src/lib/relatorios/api.ts` / `schemas.ts`: incluir novos campos em create/update e no schema do form.
- `DadosGeraisTab.tsx`: novo `Select` **Tipo de fonte** (SQL / API REST). Quando `api_rest`, mostra inputs **Endpoint URL** e **URL de destino**.
- `ReportEditor.tsx`:
  - Quando `tipo_fonte === 'api_rest'`:
    - oculta as abas **SQL** e **Pré-visualização**;
    - exibe banner "Relatório customizado (API REST) — esta tela é apenas para documentação de campos, colunas e parâmetros";
    - abas **Parâmetros**, **Colunas** e **Layout** ficam em modo leitura (props `readOnly`);
    - adiciona botão **Abrir relatório** no cabeçalho que navega para `url_destino` quando preenchido.
  - SQL padrão segue funcionando igual.
- `ParametersEditor.tsx`, `ColumnsEditor.tsx`, `LayoutEditor.tsx`: aceitar prop opcional `readOnly` (desabilita inputs/botões; nenhum impacto no fluxo SQL).
- `ReportList.tsx`: badge pequeno "API" ao lado do nome quando `tipo_fonte === 'api_rest'`.

### 3. Fora do escopo

- Não altera nada da tela `/producao/impressao-ordem-producao` em si.
- Não muda histórico de execuções nem exportações (RELAPROP usa fluxo próprio).
- Não adiciona novos endpoints no FastAPI.

---

## Plano de validação

1. Após migração, abrir `/relatorios/desenvolvimento` e ver o RELAPROP listado com badge "API" e status "publicado".
2. Selecionar → editor abre sem aba SQL/Preview, mostra banner read-only, abas Parâmetros/Colunas/Layout populadas.
3. Botão "Abrir relatório" leva para `/producao/impressao-ordem-producao`.
4. Criar/editar relatórios SQL existentes continua funcionando idêntico (regressão).
