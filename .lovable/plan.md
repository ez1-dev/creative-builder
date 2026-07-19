## Problema

Backend passou a devolver `GET /api/requisicoes/op/{codori}/{numorp}` no formato:

```json
{ "op": { "sitorp", "situacao_desc", "pode_requisitar", "motivo_bloqueio", "produto_final", "descricao", "qtd_prevista", "qtd_produzida", "saldo", "centro_custo", "codfam", "numped", "projeto_obra", "derivacao" }, "componentes": [...], "total_componentes": N }
```

O front lê `resposta.pode_requisitar`, `resposta.produto_final`, etc. no topo → tudo vira `undefined` → campos "—" + banner de bloqueio indevido em **Nova requisição — com OP** (`NovaRequisicaoOpPage`) e **Portal de Requisições** (`PortalRequisicoesPage`).

## Solução

Normalizar a resposta em **um único ponto** — `requisicoesApi.consultarOp` em `src/services/requisicoesApi.ts` — achatando `op.*` para o topo e mapeando os novos nomes para os campos que o tipo `OpConsultaResponse` já expõe. Assim as duas telas continuam funcionando sem alteração de lógica.

### Passos

1. **`src/types/requisicoes.ts`** — em `OpConsultaResponse`:
   - Manter os campos atuais (`produto_final`, `descricao`, `situacao`, `quantidade_prevista`, `quantidade_produzida`, `pode_requisitar`, `motivo_bloqueio`, `componentes`).
   - Adicionar opcionais para o payload enriquecido: `situacao_desc?: string | null`, `saldo?: number | null`, `centro_custo?: string | null`, `codfam?: string | null`, `numped?: number | string | null`, `projeto_obra?: string | null`, `derivacao?: string | null`, `total_componentes?: number`.

2. **`src/services/requisicoesApi.ts` → `consultarOp`** — detectar formato aninhado e normalizar:
   - Se `raw.op` existe: mesclar `raw.op` no topo, manter `componentes` de `raw.componentes`.
   - Mapear aliases: `sitorp → situacao`, `qtd_prevista → quantidade_prevista`, `qtd_produzida → quantidade_produzida`, `codder → derivacao` (fallback), preservar `situacao_desc`, `saldo`, `motivo_bloqueio`, `centro_custo`, `projeto_obra`.
   - Compat com o formato antigo (chaves já no topo) — retornar como está.

3. **`src/pages/requisicoes/NovaRequisicaoOpPage.tsx`** — na área "Resumo da OP selecionada":
   - Exibir `op.data.situacao_desc ?? op.data.situacao` como situação.
   - Mostrar `Saldo` (`op.data.saldo`) e `Centro de custo` quando presentes.
   - Banner de bloqueio: mostrar apenas quando `pode_requisitar === false`, usando `motivo_bloqueio` como texto principal.
   - Projeto/Obra e Derivação exibem `—` sem tratar como erro (já é o comportamento de `Field`).

4. **`src/pages/requisicoes/PortalRequisicoesPage.tsx`**:
   - Preferir `op.data.situacao_desc ?? op.data.situacao` no texto de status.
   - Alerta de bloqueio somente com `pode_requisitar === false`.

Sem tocar em cálculos, lógica de gating do SID, mutations ou tabela de componentes.

### Verificação

- `tsgo` limpo.
- Abrir `/requisicoes/nova-op`, buscar OP `100/65958` (situação L) e `220/21402` (situação A): campos preenchidos, sem banner de bloqueio.
- Simular `pode_requisitar=false` (ex.: OP finalizada) → banner exibido com `motivo_bloqueio`.

## Fora de escopo

- Endpoints de lookup adicionais (Centro de Custo E044CCU / Projeto-Obra) — trato em uma próxima rodada se você confirmar.
- Restart da 8070 e teste SID (dependem do seu ambiente).