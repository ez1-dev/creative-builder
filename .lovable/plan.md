## Contexto

Boa parte da spec já está implementada (mapeamento `raw.op.*`, campos limpos de componentes, chip `/sid/ping`, lookups de CC/Projeto/Componente com UM read-only, "Depósito sugerido" + disclaimer, `Salvar rascunho (local)`, toast `ERP recusou a requisição` com `detail`). Este plano fecha as lacunas que ainda travam os critérios de aceite, sem reescrever módulos fora de requisições.

Endpoints existentes que serão usados (não crio nenhum novo):

- `GET /api/requisicoes/sid/ping` — status `sid_habilitado`.
- `GET /api/requisicoes/op/{codori}/{numorp}` — consulta OP.
- `POST /api/requisicoes/sid/requisitar` — cria requisição avulsa direto no ERP.
- `POST /api/requisicoes/sid/baixar-componentes` — baixa componente de OP.
- `GET /api/requisicoes/lookup/{centros-custo|projetos|componentes|depositos}` — autocomplete.

## Lacunas contra os critérios de aceite

1. **Requisição sem OP não usa o SID.** `NovaRequisicaoAvulsaPage` monta payload de rascunho (`POST /api/requisicoes` + `enviar`) — o critério exige `POST /api/requisicoes/sid/requisitar` e exibir `numeme/seqeme`.
2. **Depósito no formulário avulso é `Input` livre.** Precisa virar autocomplete pelo lookup `/depositos`, com rótulo "Depósito sugerido" e disclaimer.
3. **Identidade do operador não é exibida.** Nenhuma tela mostra "Operando como" nem "Usuário ERP".
4. **Baixa com OP não usa `/sid/baixar-componentes`.** O passo 4 da `NovaRequisicaoOpPage` faz o fluxo de rascunho; falta o modal de confirmação destacado ("movimento real de estoque, sem estorno automático") por componente selecionado, seguido do POST direto.
5. **Faltam guard-rails de UX exigidos**: aviso de abandono de formulário sujo, foco no primeiro erro, botão "Nova requisição" após sucesso avulso, refresh dos componentes da OP após baixa, mensagem específica de timeout.

## 1. Requisição sem OP → SID direto

Arquivo: `src/pages/requisicoes/NovaRequisicaoAvulsaPage.tsx`.

- Trocar a submissão por `requisicoesApi.sidRequisitar(...)` (endpoint já existente). Um item por chamada; para múltiplos itens, disparar em sequência e agregar resultados.
- Payload por item: `{ codpro: linha.codcmp, codder: null, qtdeme: linha.quantidade, codtns: <default configurável, hoje 90250>, coddep: depositoSugerido.codigo, ccures: cc?.codccu, obseme: linha.observacao }`.
- Substituir `Input` de "Dep. origem" por `RemoteCombobox` do lookup `depositos`, renomear coluna para **"Depósito sugerido"** com helper text: *"O depósito informado é uma sugestão. O depósito definitivo poderá ser determinado pelas regras do ERP durante o atendimento."*
- Remover campos que não têm contrato SID no avulso ("Dep. dest." e "Lote"), mantendo `observação`.
- Validação: exigir componente selecionado da lista, `quantidade > 0`, depósito escolhido e CC quando `ccObrigatorio`. Bloquear duplo submit (`busy`), mostrar skeleton no lookup e foco automático no primeiro campo inválido.
- Sucesso com `numeme` numérico: toast **"Requisição {numeme}/{seqeme} criada com sucesso no ERP Senior."**, painel de resultado inline (não limpar formulário até o usuário clicar em **"Nova requisição"**).
- Sucesso com `numeme: null` + `aviso_parse`: alerta amarelo *"A requisição foi processada, mas o número não pôde ser interpretado automaticamente. Confira no ERP Senior."* Sem inventar número, sem regex.
- Erro 400 (`RequisicaoApiError`): `Alert` destrutivo com `detail` visível dentro da página (além do toast).
- `Salvar rascunho` continua local (`localStorage`) com rótulo **"Salvar rascunho (local)"** e nota "Rascunho salvo somente neste navegador."
- Botão de escrita fica desabilitado quando `sid_habilitado === false`.

## 2. Baixa com OP → SID direto + confirmação destacada

Arquivo: `src/pages/requisicoes/NovaRequisicaoOpPage.tsx`.

- No passo 4, para cada item selecionado, executar `requisicoesApi.sidBaixarComponentes({ codori, numorp, codetg, seqcmp, qtd, codlot: null, numser: null })` em série; interromper e reportar no primeiro erro.
- Antes do envio, abrir `Dialog` **"Confirmar consumo de material"** com:
  - OP (`codori/numorp`), produto final, componente, quantidade + unidade, depósito sugerido, **usuário responsável** (portal + ERP).
  - Bloco de aviso destacado (variant destrutivo): *"Esta operação gera um movimento real de estoque no ERP Senior. A baixa não possui estorno automático nesta aplicação. Confirme somente quando o consumo realmente estiver ocorrendo."*
  - Botões: `Cancelar` e `Confirmar baixa no ERP`; após clique, desabilita e mostra spinner. Sem re-submit automático em erro/timeout.
- Após sucesso: refetch de `useOpConsulta` para atualizar `qtd_utilizada` e `qtd_disponivel_requisitar`, manter a OP selecionada, zerar apenas as quantidades informadas.
- Timeout na escrita: manter o botão bloqueado e exibir alerta *"Não foi possível confirmar se o ERP concluiu a operação. Consulte a situação no ERP ou atualize a tela antes de reenviar."*
- Validação existente (`itensSemDeposito`, `itensInvalidos`) segue valendo.

## 3. Identidade do operador (portal + ERP)

Componente novo: `src/components/requisicoes/OperadorBadge.tsx` — recebe do `useAuth()`:

- **Operando como:** `displayName ?? session.user.email` — `session.user.email`.
- **Usuário ERP:** `profile.erp_user` (já carregado em `AuthContext`); quando ausente, chip vermelho *"Login não vinculado ao ERP. Solicite o vínculo antes de operar."* e o botão de envio (avulso ou baixa) fica bloqueado com tooltip.
- `codusu` (código numérico do usuário no ERP) **não existe hoje em nenhum endpoint do projeto** — item aberto abaixo. Enquanto o backend não expuser, o badge mostra apenas `erp_user`.

Usar o badge:

- Topo da `NovaRequisicaoAvulsaPage` (bloco fixo acima do formulário).
- Topo da `NovaRequisicaoOpPage` (linha do `PageHeader`).
- Dentro do diálogo de confirmação de baixa (campo obrigatório visível).

Bloquear submit em ambas as telas quando `erp_user` estiver vazio.

## 4. UX transversal

- **Guard de abandono**: hook `useUnsavedChangesGuard` (novo, pequeno) usado em `NovaRequisicaoAvulsaPage` e `NovaRequisicaoOpPage` — dispara `window.confirm` no `beforeunload` e em `useBlocker` do react-router quando `dirty === true`.
- **Foco automático no primeiro erro**: no submit, marcar `data-error-focus` no primeiro elemento inválido e focar via `ref`.
- **Pós-sucesso avulso**: painel com número, botão **"Nova requisição"** (reseta form) e **"Ver na lista"** (navega `/requisicoes`).
- **Pós-sucesso baixa**: toast + refetch + limpar quantidades; mantém componentes na tela.
- **Timeout**: `apiWrite` já respeita `timeoutMs`; adicionar catch específico para `AbortError`/`timeout` nas duas telas exibindo a frase acima.

## 5. Higienização

- Nenhuma credencial técnica é lida nem exibida no frontend (já ok — verificar que não há `console.log` de payload sensível).
- Nenhum dado mockado: `src/mocks/requisicoes.ts` só é usado em teste — manter fora dos componentes de produção.

## Arquivos alterados

- `src/pages/requisicoes/NovaRequisicaoAvulsaPage.tsx` — refatorar submit para SID; novo lookup de depósito; painel de resultado; guard.
- `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` — passo 4 usa SID + diálogo de confirmação; refetch pós-sucesso; guard; mensagem de timeout.
- `src/components/requisicoes/OperadorBadge.tsx` — novo.
- `src/components/requisicoes/ConfirmarBaixaDialog.tsx` — novo (extraído para reutilizar entre OP page e, opcionalmente, Portal).
- `src/hooks/useUnsavedChangesGuard.ts` — novo, isolado.
- `src/services/requisicoesApi.ts` — sem novos endpoints; apenas ajustes de tipos (`SidRequisitarResponse` com `numeme|seqeme|aviso_parse`).
- `src/types/requisicoes.ts` — tipagem do retorno SID e do operador.

Não altero: menu, `PortalRequisicoesPage`, `RequisicoesListPage`, `AprovacoesPage`, `AlmoxarifadoFilaPage`, `RequisicaoDetalhePage`, backend, Supabase.

## Verificação

- `tsgo` limpo.
- `/requisicoes/nova` (avulsa): envio com integração desabilitada mostra chip e bloqueia; envio real com OP inválida mostra `detail` do ERP em `Alert` visível; sucesso mostra `numeme/seqeme` e botão "Nova requisição"; abandono com dirty pede confirmação.
- `/requisicoes/nova-op`: passo 4 abre diálogo de confirmação com "Operando como" + "Usuário ERP" + aviso de movimento real; sucesso refaz consulta da OP; erro 400 mostra `detail`; sem duplo envio.
- `erp_user` vazio no perfil bloqueia envio nas duas telas.

## Item aberto (backend)

- `codusu` (código numérico do usuário Senior a partir do login do portal): não há endpoint no projeto. Se o backend expuser `GET /api/requisicoes/usuario-erp?login=...` (ou similar), o badge passa a mostrar `nome — codusu` e bloquear quando `ambíguo === true`. Enquanto isso, uso `profile.erp_user` como identidade ERP.

## Fora de escopo

- Backend/SOAP, Supabase, autenticação global, demais páginas de requisições, permissões, menu.
