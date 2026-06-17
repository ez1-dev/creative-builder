## Problema

Na tela `/bi/contabilidade/dre-dinamica/montador`, a coluna **Nome da conta** aparece como `—` e os **valores** ficam zerados ou em branco. Verifiquei o Cloud: `bi_vm_lanc_contabil` está vazio (0 linhas), portanto toda a tela depende do endpoint FastAPI `GET /api/bi/contabilidade/dre-dinamica/plano-contas`. Hoje o mapper espera campos específicos (`ds_conta`, `valor_total`, `qtd_lancamentos`) e, se o backend devolver outros nomes (ex.: `descricao`, `total`, `qtde`, `saldo`, `vl_saldo`), tudo cai pra default vazio/zero.

## Ajustes (somente frontend + doc)

### 1. `src/lib/bi/dreMontadorApi.ts` — mapper tolerante e diagnóstico

- Aceitar aliases de campos do backend, sem mudar o contrato exposto:
  - `ds_conta` ← `ds_conta | descricao | nome_conta | nome | conta_descricao | ds_conta_contabil`
  - `valor_total` ← `valor_total | total | valor | vl_saldo | saldo`
  - `qtd_lancamentos` ← `qtd_lancamentos | qtde | qtd | quantidade | qtd_lanc`
  - `centros_custo[].ds_centro_custo` ← `ds_centro_custo | descricao | nome | ds_ccu`
  - `centros_custo[].valor` ← `valor | valor_total | total | vl_saldo`
  - `centros_custo[].qtd` ← `qtd | qtd_lancamentos | qtde`
- Logar uma amostra do primeiro item cru e do mapeado:
  ```ts
  console.log('[MONTADOR DRE] plano-contas raw sample:', arr[0]);
  console.log('[MONTADOR DRE] plano-contas mapped sample:', mapped[0]);
  ```
- Logar `console.warn` quando 100% dos itens vierem com `ds_conta` vazio ou `valor_total === 0`, indicando claramente que o backend não está retornando esses campos.

### 2. `src/pages/bi/contabilidade/DreMontadorPage.tsx` — UX de diagnóstico

- Acima da tabela de contas, banner discreto (amber) quando detectarmos:
  - Todas as contas com `ds_conta` vazio → texto: *"Backend não está retornando `ds_conta`. Ajuste o endpoint `/plano-contas` para incluir a descrição da conta."*
  - Todas as contas com `valor_total === 0` → texto: *"Valores zerados — verifique se o endpoint agrega `bi_vm_lanc_contabil` no período selecionado."*
- Quando `ds_conta` vier vazio, exibir a `cd_mascara` como fallback visível no lugar do `—` (em itálico muted), pra usuário não achar que está bugado.
- Mostrar o `valor_total` em vermelho quando negativo (já existe) e exibir `R$ 0,00` explícito (já existe).
- Manter os logs atuais e adicionar `console.log('[MONTADOR DRE] contas recebidas:', contas.length)` após cada `setContas`.

### 3. `docs/backend-bi-contabilidade-dre-dinamica-montador.md`

- Adicionar seção **"Campos obrigatórios na resposta"** listando explicitamente:
  - `ds_conta` (string) — descrição da conta no plano de contas do ERP
  - `valor_total` (numeric) — soma de `vl_saldo` (ou equivalente) no período
  - `qtd_lancamentos` (int) — `count(*)` no período
  - `nivel` (int) — segmentos da máscara
  - `centros_custo[]` (array) — agregado por centro de custo no período
- Incluir SQL de referência usando `bi_vm_lanc_contabil` + join com plano de contas do ERP Senior para `ds_conta`.

## Fora de escopo

- Não criar fallback Cloud — `bi_vm_lanc_contabil` está vazio no Cloud, não há de onde puxar localmente.
- Não alterar payload de `vincular-contas`.
- Não mexer no endpoint `/dre-dinamica` (linhas à esquerda).
