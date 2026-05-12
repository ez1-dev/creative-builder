# Plano: Ações condicionais por origem na tela Regras LSP

Objetivo: cada linha da lista mostra ações diferentes conforme `origem === 'E098REG'` (ERP) ou `'PORTAL'`. Os dialogs de "Alterar situação" e "Alterar regra vinculada" já existem (usados em Identificadores) — só precisam ser reaproveitados a partir de um objeto `RegraLSP`. Falta criar o "Clonar para portal".

## 1. Reutilização dos dialogs existentes

`AlterarSituacaoDialog` e `AlterarRegraDialog` recebem hoje um `Identificador`. Vou adaptar as props para aceitar também `RegraLSP` via helper local que extrai `{ codemp, modsis, idereg, codtns, situacao? }`.

Abordagem mínima: criar pequenos wrappers em `RegrasList.tsx` que montam um objeto compatível com `Identificador` a partir da `RegraLSP` (gerar `situacao: 'A'` default, já que o backend ignora — só usa para preencher o radio inicial, vamos usar `'A'`).

## 2. Novo dialog `ClonarParaPortalDialog.tsx`

Campos pré-preenchidos a partir da `RegraLSP`:
- Nome da regra (editável, default `regra.nome_regra`)
- Código ERP (read-only, `regra.codreg_erp`)
- Empresa (read-only, `regra.codemp`)
- Módulo (read-only, `regra.modsis`)
- Identificador (read-only, `regra.idereg`)
- Transação (read-only, `regra.codtns`)
- Descrição (editável)
- Ticket (editável, opcional)
- Motivo (obrigatório)
- Fonte LSP (textarea grande, vazia, opcional — a regra pode ser criada sem fonte e o usuário cola depois)

Submit: `seniorApi.criarRegra({ nome_regra, codreg_erp, codemp, modsis, idereg, codtns, descricao, ambiente: 'homologacao', ticket, motivo, fonte_lsp })`.

Após sucesso: toast, fechar dialog, `carregar()` na lista e redirecionar para `/regras-senior/regras/<novo_id>?edit=1` (se a resposta vier com `id_regra` ou `id`).

## 3. Menu de ações na `RegrasList.tsx`

Trocar a fileira de botões por um `DropdownMenu` (já existe em `@/components/ui/dropdown-menu`). Trigger: `Button variant="ghost" size="icon"` com `MoreHorizontal`.

**Itens quando `origem === 'PORTAL'`:**
- Ver detalhes → `navigate(/regras-senior/regras/:id_regra)`
- Editar fonte LSP → `navigate(/regras-senior/regras/:id_regra?edit=1)`
- Validar → chama `seniorApi.validarRegra` e mostra toast com avisos
- Exportar TXT → `seniorApi.exportarRegraTxtUrl`
- Alterar status → abre `AlterarStatusRegraDialog`
- Ver versões → abre `VerVersoesDialog`

**Itens quando `origem === 'E098REG'`:**
- Ver detalhes (desabilitado se `id_regra == null`, com tooltip)
- Alterar situação → abre `AlterarSituacaoDialog` adaptado
- Alterar regra vinculada → abre `AlterarRegraDialog` adaptado
- Clonar para portal → abre novo `ClonarParaPortalDialog`
- Ver auditoria → `navigate(/regras-senior/auditoria?codemp=&modsis=&idereg=)`

Itens de fonte LSP (Editar/Validar/Exportar TXT/Ver versões) não aparecem no menu E098REG. Em vez disso, exibir um item disabled no topo do menu com texto "Fonte LSP não disponível no portal" e tooltip explicativo.

## 4. Aviso em detalhe (futuro)

A página de detalhe (`RegraDetalhePage`) só é alcançada quando há `id_regra`, então o aviso entra como `<AvisoErpBanner>` exibido condicionalmente quando `origem === 'E098REG'` no header do detalhe. **Fora do escopo desta entrega** porque hoje E098REG sem `id_regra` nem chega lá — vamos deixar marcado como follow-up.

## Arquivos a alterar/criar

- `src/components/regras-senior/ClonarParaPortalDialog.tsx` (novo)
- `src/components/regras-senior/AlterarSituacaoDialog.tsx` — aceitar prop alternativa `target: Identificador | { codemp, modsis, idereg, codtns, situacao? }`. Ajuste retrocompatível.
- `src/components/regras-senior/AlterarRegraDialog.tsx` — mesma flexibilização.
- `src/components/regras-senior/RegrasList.tsx` — substituir botões por `DropdownMenu` com dois conjuntos de itens, abrir os dialogs adequados.
- (sem mudanças em backend, types, mappers ou rotas)

## Fora de escopo

- Banner de aviso na página de detalhe (registros E098REG sem `id_regra` ainda não têm rota de detalhe).
- Importação de TXT na clonagem (somente colar/digitar fonte LSP por enquanto).
- Não mexer em login/rotas/layout geral.
