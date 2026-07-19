# Portal de Requisições — `/requisicoes/portal`

Página única de consulta de OP + preparação/execução das ações SID, tratando 503 como "aguardando habilitação" (não erro do usuário). Reaproveita a API já existente em `src/services/requisicoesApi.ts` e o hook `useSidStatus` / `useSidWriteEnabled`.

## Arquivos novos

- `src/pages/requisicoes/PortalRequisicoesPage.tsx` — página principal.
- `src/components/requisicoes/portal/ConsultaOpCard.tsx` — input `codori` + `numorp` (com suporte a leitura de código de barras via `Enter` no input único no formato `codori|numorp` ou `codori-numorp`), botão "Consultar", loading/erro.
- `src/components/requisicoes/portal/OpCabecalhoCard.tsx` — mostra produto, `sitorp` com `StatusBadge` customizado, banner de bloqueio quando `pode_requisitar=false`.
- `src/components/requisicoes/portal/ComponentesTable.tsx` — tabela com `codcmp, codder, unimed, coddep, qtdprv, qtduti, qtdreq, qtdtrf, qtd_disponivel_requisitar` (destacada), input "Qtd a requisitar" (max=disponível, `step="any"`), botões **Reservar** e **Baixar** por linha.
- `src/components/requisicoes/portal/SidStatusMiniCard.tsx` — card discreto com `sid_habilitado` (badge) e ícone verde/vermelho por serviço (`ger_sid`, `cha_separacao`) usando `wsdl_ok`. Reusa `useSidStatus`.
- `src/components/requisicoes/portal/RequisitarAvulsoDialog.tsx` — formulário para `POST /sid/requisitar` (`codpro, codder, qtdeme, codtns, coddep, ccures, obseme`).
- `src/components/requisicoes/portal/RateioDialog.tsx` — formulário para `POST /sid/rateio` (uma linha: `codccu|numprj|ctared` + `perrat|qtdrat|vlrrat`, valida "só um por grupo").
- `src/components/requisicoes/portal/AtenderDialog.tsx` — formulário para `POST /sid/atender` (`numeme, seqeme, qtdatd, coddep, deptrf, codtns, codlot`).
- `src/components/requisicoes/portal/ExcluirDialog.tsx` — `POST /sid/excluir` com confirmação por texto.

## Arquivos editados

- `src/App.tsx` — registrar rota `/requisicoes/portal` (lazy) protegida por permissão.
- `src/lib/screenCatalog.ts` — registrar `REQ_PORTAL` (`Requisições — Portal`).
- `src/config/menuCatalog.ts` — adicionar item "Portal de Requisições" no grupo Requisições.
- `src/hooks/requisicoes/index.ts` — adicionar hooks `useConsultaOp(codori, numorp)`, `useSidRequisitar`, `useSidRateio`, `useSidAtender`, `useSidReservarComponente`, `useSidBaixarComponentes`, `useSidExcluir`. Cada mutation captura `IntegracaoDesabilitadaError` (503) e sinaliza estado "aguardando habilitação" via toast informativo (não `toast.error`).

## Comportamento

### Consulta de OP
- Input duplo `codori` + `numorp`, ou input único "código de barras" que aceita `codori|numorp`, `codori-numorp`, `codori numorp`.
- `useConsultaOp` chama `requisicoesApi.consultaOp(codori, numorp)` (já existe em `apiGet /api/requisicoes/op/{codori}/{numorp}`).
- Estados: idle / loading (skeleton) / erro (404 = "OP não encontrada") / sucesso.

### Cabeçalho
- Produto, `sitorp` com badge.
- Se `op.pode_requisitar === false`: banner amber "OP não aceita requisição (situação {sitorp})", desabilita todos os inputs de quantidade e botões Reservar/Baixar/Atender.

### Componentes
- Coluna "Disponível" destacada (bold, cor primária).
- Input "Qtd a requisitar" com `max={qtd_disponivel_requisitar}` e validação client-side.
- Botão **Reservar** → abre confirmação e chama `POST /sid/reservar-componente` com `{codori, numorp, codetg, seqcmp, qtd, codcmp, coddep, lotes: []}`.
- Botão **Baixar** → abre confirmação e chama `POST /sid/baixar-componentes` com `{codori, numorp, codetg, seqcmp, qtd, codlot?}`.
- Botões **Reservar/Baixar/Atender/Requisitar** ficam `disabled` quando `useSidWriteEnabled().enabled === false`, com tooltip do motivo. Banner `IntegracaoOfflineBanner` no topo se offline.

### Ações auxiliares
- Botão global **Requisição avulsa** abre `RequisitarAvulsoDialog` (defaults úteis pré-preenchidos: `codtns=90250` para consumo). Aviso: valor é apenas default; ERP valida.
- Botão **Rateio** por item da requisição já emitida (abre com `numeme/seqeme` retornados).
- Botão **Excluir requisição** (aparece após sucesso do requisitar) → `sid/excluir`.

### Defaults de TNS
- Constante local em `src/lib/requisicoes/tnsDefaults.ts` (novo arquivo pequeno): `TNS_DEFAULTS = { CONSUMO_AVULSO: '90250', TRANSFERENCIA: '90253', BAIXA_OP: '90251' }`. Usados apenas como sugestão inicial nos dialogs; usuário pode alterar. Nenhuma regra de negócio adicional no frontend.

### Tratamento 503
- Interceptor: `requisicoesApi` já lança `IntegracaoDesabilitadaError` em 503. Nos dialogs e handlers, `catch (e)`:
  - `if (e instanceof IntegracaoDesabilitadaError)` → `toast.message("Aguardando habilitação SID", { description: e.message })` e mantém formulário aberto.
  - `else` (400) → `toast.error(detail || 'Falha')`.
- Após sucesso: `toast.success` com `numEme` retornado (e `seqEme` quando aplicável). Copia `numEme` para clipboard via botão.

### Status da integração
- `SidStatusMiniCard` no topo direito da página: badge `sid_habilitado` (verde/amarelo) e dois ícones para `ger_sid` / `cha_separacao` (verde se `wsdl_ok`, vermelho caso contrário). Atualiza junto com `useSidStatus` (polling 2min já configurado).

## Detalhes técnicos

- Todas as mutations usam `X-Idempotency-Key` gerado com `crypto.randomUUID()` (padrão já existente em `sidRequisitar` etc.).
- Sem chamadas diretas ao Supabase — toda escrita passa pelo FastAPI.
- Nenhuma alteração em edge functions, RLS ou tabelas do backend Cloud.
- Sem mudança nas outras páginas de Requisições.
- Typecheck: `tsgo --noEmit` deve passar.

## Fora de escopo

- Não altera fluxo de aprovações, fila de almoxarifado ou detalhamento existente.
- Não adiciona persistência local de rascunhos do portal (pode ser fase 2).
- Não implementa leitor de câmera (só aceita entrada de teclado / scanner USB via input).
