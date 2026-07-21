## Ajustes finais no Razão (DRE + Balanço) para o novo contrato

O drawer (`src/components/dre-studio/DrillDrawer.tsx`) já consome quase todo o contrato novo: colunas separadas de usuário, destaque `usuario_origem_difere`, tooltip com `documento_origem`, sufixo `(?)` para `ambiguo`, seleção de conta quando `precisa_selecionar_conta === true`, botão "Trocar conta", e o modal já tem seções para documento de origem e "Origem do usuário". Faltam 5 ajustes objetivos para bater 100% com a especificação.

### 1. Parar de mandar `clacta` na chamada da DRE

Hoje o drawer envia `clacta` para o hook quando `args.clacta` chega preenchido, e o hook (`src/hooks/contabil/api.ts`, `useDrillLancamentos`) repassa para a URL. A spec exige que a DRE use **apenas** `modelo_id + linha_id` (e, depois da seleção, `ctared`), nunca junto com `clacta`. Ajuste:

- Em `DrillDrawer.tsx`, remover o campo `clacta` do payload passado a `useDrillLancamentos`.
- Continuar exibindo `clacta` só como rótulo no cabeçalho (via `meta.clacta`/`contaEscolhida.clacta`), sem virar parâmetro de consulta.
- O hook continua aceitando `clacta` para os poucos consumidores legados (drill de grupo), mas o drawer não usa mais.

### 2. Chip visível "Documento" / "Lote" na coluna Usuário Origem

Hoje a fonte aparece apenas no tooltip. Spec pede indicador discreto sempre visível. Ajuste:

- Ao lado do nome de `usuario_origem` renderizar um `<span>` pequeno com classes tipo `text-[10px] uppercase tracking-wide` mostrando `Documento`, `Lote` ou nada quando `usuario_origem_fonte` for `null`.
- Cor neutra (muted) por padrão; âmbar quando `divergeDocumento`; azul quando `divergeLote`.
- Quando `usuario_origem` for `—`, não mostrar o chip.

### 3. Badge "Diferente do lançamento" ao lado do usuário

Além do fundo âmbar/faixa lateral, mostrar um selo textual explícito quando `usuario_origem_difere === true` **e** `usuario_origem_fonte === "documento"` (o único caso com significado operacional). Ex.: `<Badge variant="outline">Diferente do lançamento</Badge>` na mesma célula. Para `fonte === "lote"`, manter apenas o realce discreto atual, sem badge.

### 4. Aviso de truncamento no rodapé

Já existe `q.data.truncado`/`qtd_total`/`qtd_exibida` sendo lidos, mas nada é renderizado. Adicionar no rodapé (`temContratoRazao` block, junto dos totais) uma linha condicional quando `truncado === true`:

> Exibindo **{qtdExib}** de **{qtdTotal}** lançamentos. Aumente o limite para ver mais.

Botão "Aumentar limite" continua funcionando com `LIMITE_STEPS` (já existe).

### 5. Reorganizar o modal como seção "Rastreabilidade"

O `Dialog` do detalhe (`Lançamento {n}`) já tem os campos, mas embaralhados com dados contábeis. Reagrupar em blocos nomeados, sem alterar dados:

1. **Cabeçalho** (atual): banner de divergência âmbar quando aplicável.
2. **Documento de origem** (atual): mantém como está.
3. **Rastreabilidade** (nova subseção com título): agrupar
   - Origem do lançamento — `origem_codigo` + `origem_descricao` (usando `labelOrigem`)
   - Usuário de origem — `usuario_origem`
   - Fonte do usuário — `Documento (USUGER)` / `Lote (E640LOT)` / `—`
   - Usuário do lançamento — `usuario_lancamento`
   - Documento — `detalhe.documento` (fallback para `{tipo|serie} {numero}` do `documento_origem`)
   - Tipo / Número / Série / Parceiro (só se `documento_origem` presente e ainda não exibido acima)
   - Campos vazios continuam mostrando `—` via componente `Info`.
4. **Contábil** (atual): empresa, filial, lote, contas D/C, CCU, valores, histórico permanecem no grid abaixo.

### 6. Compat e regras que já estão OK (não mexer)

- `usuarioOrigemValue` NÃO faz fallback para `usuario` — mantém.
- `usuarioLancamentoValue` faz `usuario_lancamento ?? usuario` — permitido pela spec (item 12).
- Não recalcular saldos: rodapé lê `total_debito`, `total_credito`, `saldo_final` do backend — mantém.
- Nenhum join/dedução no front — mantém.
- Sem alterações em `dreMatrizApi.ts`, `drillDreApi.ts`, `drillsMenu.ts`, hooks do stepper ou navegação.

### Arquivos alterados

- `src/components/dre-studio/DrillDrawer.tsx` — itens 1 (remover `clacta` do payload do hook), 2 (chip de fonte), 3 (badge de divergência), 4 (linha de truncamento no rodapé), 5 (agrupar seção Rastreabilidade no modal).
- Nenhuma alteração em `src/hooks/contabil/api.ts` nem em `src/lib/contabil/drillLancamentosApi.ts` — o hook já suporta `precisa_selecionar_conta`, `contas`, `qtd_total`, `qtd_exibida` e `truncado`.

### Critérios de aceite (validação após reinício da API)

- VEN / CPR / PAG / REC: `Usuário Origem` mostra o usuário do documento com chip **Documento**; badge "Diferente do lançamento" quando `usuario_origem_difere`.
- EST / MAN: `Usuário Origem` mostra o que vier (usuário do lote ou vazio) com chip **Lote** ou `—`; sem inferência no front.
- Documentos com `ambiguo: true` mostram sufixo `(?)` e tooltip explicativo.
- Chamada da DRE: URL nunca contém `clacta`; só `modelo_id + linha_id` (e `ctared` depois da seleção).
- Rodapé mostra "Exibindo X de Y" quando `truncado === true`.
- Modal exibe seção **Rastreabilidade** com todos os campos e `—` para vazios.
