# Ajustes no Razão (drill-lancamentos) — novo contrato do backend

Alvo: `src/components/dre-studio/DrillDrawer.tsx` (o arquivo em `src/components/contabil/DrillDrawer.tsx` é reexport, cobre os dois). Também `src/lib/contabil/drillLancamentosApi.ts` (tipos) e `src/hooks/contabil/api.ts` (`useDrillLancamentos` — repassar novos campos).

O front já:
- Manda `modelo_id` + `linha_id` (nunca `clacta=<codigo da linha>`);
- Suporta `anomes_ini`/`anomes_fim` (todos os meses);
- Mostra badge/tooltip/AlertTriangle quando `usuario_origem_difere===true`;
- Renderiza `mov_debito`, `mov_credito`, `saldo_anterior`, `saldo`, `saldo_inicial`/`saldo_final`, `total_debito`/`total_credito`, `truncado`, `qtd_total`/`qtd_exibida`;
- Respeita `drillavel=false` (DrillsMenu não aparece) e `drills_menu`.

Ficam faltando três coisas do novo contrato:

## 1. Distinguir `usuario_origem_fonte` = "documento" vs "lote"

Regras de destaque na tabela e no modal:
- `fonte === "documento"` **e** `usuario_origem_difere === true` → é a informação de auditoria útil (VEN/CPR/PAG/REC). Manter badge âmbar + AlertTriangle atuais, mas trocar o tooltip para:
  *"Documento emitido por **{usuario_origem}** · Lançamento por **{usuario_lancamento}**"*.
- `fonte === "lote"` → não é divergência de módulo, é fallback (mesma pessoa em ~99% dos casos). Não pintar linha; se `difere===true` (raro, 3/169k), badge azul discreto com tooltip "Lote aberto por … · lançado por …".
- `fonte === null` ou ausente → comportamento atual (sem destaque).

Ajustar `usuarioOrigemValue`/`usuarioLancamentoValue` para permanecerem como estão; a lógica extra vive no cálculo de `divergeUsuario`.

## 2. Coluna "Usuário Origem" com detalhe do documento

Quando `documento_origem` existir na linha, transformar o texto do usuário em um trigger de tooltip com o resumo do documento:

```
NFE 20568 — RIZZI & CIA LTDA
Emitida por kamila.leite
```

Formato do rótulo: `{tipo|serie} {numero} — {parceiro_nome}` (usar `serie` para NFV/NFC quando presente; senão `tipo`; nos títulos TCP/TCR não há série).

Se `documento_origem.ambiguo === true`, adicionar sufixo "(?)" e nota no tooltip "Número casou com múltiplos documentos com emissores diferentes — usuário caiu no dono do lote".

No **modal de detalhe** (Dialog "Lançamento N") adicionar seção "Documento de origem" com os campos: tipo/descricao, série, número, parceiro (tipo + código + nome), e badge amarelo quando `ambiguo`. Reaproveitar `documento_origem.numero`/`serie` para preencher o campo "Documento" quando `detalhe.documento` estiver vazio.

Também adicionar a linha "Origem do usuário" no modal: "Documento (USUGER)" | "Lote (E640LOT)" | "—".

## 3. Passo de seleção de conta (`precisa_selecionar_conta`)

Novidade estrutural. Hoje o drawer pressupõe conta única. Quando a linha da DRE tem várias contas, o backend responde:

```json
{ "precisa_selecionar_conta": true, "contas": [ { "ctared", "clacta", "descricao", "mov_debito", "mov_credito", "qtd_lancamentos" } ], "itens": [] }
```

Comportamento novo:
- Estender `DrillLancamentosResponse` com `precisa_selecionar_conta?: boolean` e `contas?: Array<{ ctared, clacta, descricao, mov_debito, mov_credito, qtd_lancamentos }>`.
- Adicionar estado local `contaEscolhida: {ctared, clacta, descricao} | null` no DrillDrawer, resetado quando o drawer reabre.
- No hook `useDrillLancamentos`, incluir `ctared` no `queryKey`/`params` quando `contaEscolhida` estiver setado (já suportado nos params).
- Enquanto `contaEscolhida` for null **e** a resposta tiver `precisa_selecionar_conta`, renderizar uma tela intermediária: título "Escolha a conta contábil", tabela leve com colunas Conta / Descrição / Débito / Crédito / Nº lançamentos / botão "Abrir razão". Clicar seta `contaEscolhida` → refetch já traz o razão da conta.
- Quando a linha tem só 1 conta (backend já devolve o razão direto), fluxo atual não muda.
- Botão "Trocar conta" no cabeçalho quando `contaEscolhida != null`, para voltar à lista.
- Ajustar tipagem em `drillLancamentosApi.ts` e permitir que o drawer receba/envie `ctared` opcional na consulta.

## 4. Miudezas

- Confirmar labels `IOD` (Integração) e `IMP` (Importação) já em `ORIGEM_LABELS` — ok.
- Ajustar cabeçalho da coluna "Usuário Origem": tooltip atual fica; adicionar linha explicando que documento_origem alimenta o valor quando fonte=documento.
- Excel: incluir colunas "Doc. Origem" (`{tipo} {numero}`) e "Emissor" (`documento_origem.parceiro_nome`) só quando pelo menos uma linha tiver `documento_origem`.
- Manter compat: se backend antigo ainda não mandar `usuario_origem_fonte`/`documento_origem`, todos os novos comportamentos são no-ops.

## Arquivos a alterar

- `src/lib/contabil/drillLancamentosApi.ts` — expandir `DrillLancamentoItem` (`usuario_origem_fonte`, `documento_origem`, `lado`, `conta_debito/credito` como objeto) e `DrillLancamentosResponse` (`precisa_selecionar_conta`, `contas`, `meta.descricao_conta`).
- `src/hooks/contabil/api.ts` — nenhum ajuste no `useDrillLancamentos` além de garantir que `ctared` continue sendo passado quando fornecido.
- `src/components/dre-studio/DrillDrawer.tsx` — 3 blocos: passo "seleção de conta", coluna/tooltip "Usuário Origem" c/ documento, modal com seção "Documento de origem".

Nada muda no menu de drills (`DrillsMenu`), na matriz (`dreMatrizApi`) ou no drill agregado (`drillDreApi`) — o backend já entrega `drills_menu`/`drillavel` e o front respeita.

Sem alteração em cores, layout global ou fluxo do Stepper. Só ajuste de apresentação e um novo passo de escolha de conta no drawer.
