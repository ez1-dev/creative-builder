## Razão Contábil — adotar o contrato completo de rastreabilidade

Atualizar `src/components/dre-studio/DrillDrawer.tsx` (única superfície do Razão; `src/components/contabil/DrillDrawer.tsx` só re-exporta) e a tipagem em `src/lib/contabil/drillLancamentosApi.ts` para consumir os novos campos do endpoint `GET /api/contabil/drill-lancamentos`, sem alterar hooks nem lógica de saldos.

### 1. Tipagem (`drillLancamentosApi.ts` + interfaces locais do drawer)

Estender `DrillLancamentoItem` e `DrillLancamentoDocumentoOrigem` com os campos novos, todos opcionais e defensivos:

- `usuario_origem_codigo?: string | number | null`
- `usuario_origem_status?: string | null`
- `usuario_origem_fonte_tabela?: string | null`
- `usuario_lancamento_codigo?: string | number | null`
- `transacao_origem?: string | null`
- `transacao_origem_codigo?: string | number | null`
- `transacao_origem_descricao?: string | null`

Em `DocumentoOrigem`, adicionar: `fonte_tabela`, `produto`, `derivacao`, `deposito`, `bem`, `data_movimento`, `sequencia_movimento`.

Nada muda em `fetchDrillLancamentos` nem no hook.

### 2. Regras de leitura (defensivas, sem inferência)

Centralizar helpers no drawer:

```ts
const usuarioOrigem      = item.usuario_origem ?? null;                       // sem fallback
const usuarioLancamento  = item.usuario_lancamento ?? item.usuario ?? null;   // fallback legado permitido
const usuarioOrigemDifere = item.usuario_origem_difere ?? null;               // null = não comparável
const documentoOrigem    = item.documento_origem ?? null;
const transacaoOrigem    =
  item.transacao_origem ??
  [item.transacao_origem_codigo, item.transacao_origem_descricao].filter(Boolean).join(" - ") ||
  null;
```

`numeroValido` do `documento_origem.numero` rejeita `null`, `""` e `"0"` (movimentos de estoque).

### 3. Tabela do Razão

- Manter colunas independentes **Usuário Origem** e **Usuário Lcto.** (sem copiar uma na outra).
- Chip da fonte junto ao Usuário Origem:
  - `documento` → badge "Documento" (muted; âmbar se `usuario_origem_difere === true`).
  - `lote` → badge "Lote" (tom azul discreto).
  - `null` → sem chip; célula mostra `—`.
- Badge "Diferente do lançamento" só quando `usuario_origem_difere === true` **e** `usuario_origem_fonte === "documento"`.
- Quando `documento_origem.ambiguo === true`, badge "Vários documentos" com tooltip explicando que o backend não escolheu arbitrariamente.
- Nenhuma nova linha é gerada a partir de `documento_origem`; contagem/renderização continua sendo 1:1 com `response.itens`.
- Nada muda em saldo/mov: continua lendo `saldo_anterior`, `mov_debito`, `mov_credito`, `saldo`, `saldo_inicial`, `saldo_final`, `total_debito`, `total_credito` do backend.

### 4. Modal "Rastreabilidade da origem"

Substituir/renomear a seção Rastreabilidade existente do modal de detalhe para:

- **Origem** — `origem_codigo` + `labelOrigem(...)` (`origem_descricao` fallback).
- **Documento/Movimento** — resumo textual de `documento_origem`:
  - Se `numeroValido`: `tipo/serie numero — parceiro_nome` (formato atual `labelDocumentoOrigem`).
  - Se não válido: montar a partir de campos específicos por origem (Produto, Derivação, Depósito, Bem, Data do movimento, Sequência); campos ausentes ficam ocultos (não mostrar `Documento 0`).
  - Tipo/Descrição, Número (quando válido), Série, Parceiro (tipo/código/nome) continuam como linhas Info abaixo.
  - Badge "Vários documentos" no cabeçalho da seção quando `ambiguo === true`.
- **Usuário Origem** — `usuario_origem` (+ `usuario_origem_codigo` entre parênteses, se houver).
- **Fonte do Usuário** — legenda amigável: `Documento` / `Lote` / `—`; abaixo, em texto pequeno, `usuario_origem_fonte_tabela` quando fornecido (ex.: `E644LES → E210MVP.USURES`).
- **Status da resolução** — `usuario_origem_status` quando presente.
- **Usuário Lcto.** — `usuario_lancamento` (+ `usuario_lancamento_codigo` entre parênteses).
- **Transação** — `transacaoOrigem` calculada; oculta quando ausente.

Bloco Contábil (empresa/filial/lote/contas D-C/CCU/valores/histórico) permanece como está.

### 5. Chamada do endpoint

Não mudar: o drawer já envia `modelo_id + linha_id` (+ `ctared` após seleção da conta) e não envia `clacta`. Sem CPLLCT, sem joins no frontend, sem consultas a tabelas Senior.

### 6. Compat e não-regressões

- `usuarioOrigemValue` continua sem fallback para `usuario_lancamento`/`usuario`.
- Exportação Excel continua com as duas colunas atuais (Usuário Origem, Usuário Lcto.); nenhuma coluna nova por enquanto.
- Nenhum recálculo de saldo, nenhuma expansão por documento, nenhuma dedup.
- Aviso de truncamento e botão "Aumentar limite" continuam como estão.

### Arquivos alterados

- `src/lib/contabil/drillLancamentosApi.ts` — novos campos opcionais em `DrillLancamentoItem` e `DrillLancamentoDocumentoOrigem`.
- `src/components/dre-studio/DrillDrawer.tsx` — chips de fonte, badge de ambiguidade, seção "Rastreabilidade da origem" reformulada, exibição de transação, tratamento de `numero === 0` no documento, código do usuário no modal, status/fonte_tabela quando presentes.

### Critérios de aceite (após restart da API porta 8070)

- VEN/CPR/PAG/REC/PAT/EST/TES exibem `Usuário Origem` quando o backend envia; MAN/VRB/IOD/IMP podem mostrar `Lote` ou `—` sem inferência.
- Colunas Usuário Origem e Usuário Lcto. nunca compartilham valor por fallback.
- `documento_origem.numero === 0` nunca renderiza como "Documento 0" — cai no bloco de movimento (produto/derivação/depósito/data).
- `ambiguo === true` mostra badge "Vários documentos" na linha e no modal.
- `usuario_origem_difere === true` só destaca quando a fonte é `documento`.
- URL da DRE nunca contém `clacta`; só `modelo_id + linha_id` (e `ctared` após seleção).
- Nenhuma linha do Razão é duplicada por documento; totais e saldos batem exatamente com o payload.
- Frontend não parseia CPLLCT nem consulta tabelas do Senior.
