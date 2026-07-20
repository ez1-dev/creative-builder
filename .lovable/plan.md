## Objetivo

Fechar as pendências do módulo Requisições após o teste de escrita real (19/07/2026): remover chamadas ao endpoint inexistente `POST /api/requisicoes`, adotar `POST /sid/requisitar-lote` para enviar vários itens como um único documento, e ajustar tratamento de erro/sucesso conforme o novo contrato do backend.

O detalhe da OP (item 1 do prompt), os campos limpos de componente (item 2), o texto "Depósito sugerido" (item 3), os lookups com autocomplete (item 4) e o gate SID + rascunho local (item 6) **já estão implementados** e serão apenas revisados. O foco real é itens 5 e 5b.

## Mudanças

### 1. `src/services/requisicoesApi.ts`
- Adicionar `sidRequisitarLote(payload, key?)` chamando `POST /api/requisicoes/sid/requisitar-lote`.
- Manter `sidRequisitar` (single) para uso interno da nova função em fallback e testes.

### 2. `src/types/requisicoes.ts`
- Adicionar tipos para o lote:
  - `SidRequisitarLoteItemInput { codpro, codder?, qtdeme, codtns, coddep, ccures?, obseme? }`
  - `SidRequisitarLoteResponse { numeme, numemes, documento_unico, total_solicitados, criados, falhas, itens: SidRequisitarLoteItemResult[] }`
  - `SidRequisitarLoteItemResult { indice, codpro, ok, numeme?, seqeme?, erro? }`

### 3. `src/pages/requisicoes/NovaRequisicaoAvulsaPage.tsx`
- Substituir o laço item-a-item por **uma única chamada** a `sidRequisitarLote`.
- Estado `resultado` passa a armazenar `SidRequisitarLoteResponse`.
- `ResultadoPanel`:
  - Sucesso total (`falhas === 0`): "Requisição **{numeme}** criada com {criados} itens." Copiar `numeme`.
  - Sucesso parcial: lista item-a-item mostrando ✓/✗, `seqeme` quando ok, `erro` quando falhou. Aviso: "Os itens confirmados já estão no ERP — reenviar tudo duplicaria. Reenvie apenas os que falharam." Botão "Reenviar itens que falharam" que remonta o form apenas com os que falharam.
  - Se `documento_unico === false`: avisar e listar `numemes`.
- Manter aviso de que `numeme` pode ser reutilizado pelo ERP após exclusão.

### 4. `src/pages/requisicoes/NovaRequisicaoOpPage.tsx`
Refatorar `enviar()`:
- Remover `requisicoesApi.criar()` + `requisicoesApi.enviar()` (endpoint inexistente).
- Montar `itens[]` a partir dos componentes selecionados (`codpro = componente/codcmp`, `codder`, `qtdeme = quantidade`, `codtns` conforme tipo — TRANSFERIR = `90253`, BAIXAR_DIRETO = `90251`, default `90250`, `coddep = depositoEscolhido`, `ccures = op.centro_custo`, `obseme = obs[seqcmp] || obsGeral`).
- Chamar `requisicoesApi.sidRequisitarLote({ itens })`.
- Substituir a navegação `nav(/requisicoes/${id})` por um painel de resultado inline (mesmo componente `ResultadoPanel` reutilizado) com botão "Nova requisição" e "Ir para lista".
- Tratamento de erro: `RequisicaoApiError` → mostrar `detail`; `ApiOfflineError` → "Falha de comunicação. Consulte o ERP antes de reenviar."; `IntegracaoDesabilitadaError` → mensagem específica.
- Descartar rascunho local somente após `falhas === 0`.

### 5. Componente compartilhado `src/components/requisicoes/ResultadoRequisicaoLote.tsx` (novo)
- Renderiza o resultado do lote (usado por Avulsa e OP).
- Props: `resultado: SidRequisitarLoteResponse`, `onNova()`, `onReenviarFalhas(indices: number[])`, `onIrParaLista()`.

### 6. Ajustes menores
- `NovaRequisicaoAvulsaPage`: remover o `RASCUNHO_KEY` inconsistente ou mantê-lo — sem mudança funcional.
- Nenhuma mudança no OP consulta (item 1/2/3 já mapeado no `normalizeOpConsulta`).

## Fora do escopo

- Não alterar `PortalRequisicoesPage` (já usa `sidRequisitar` single via `useSidRequisitar`, cenário legado).
- Não alterar backend/edge functions — mudanças puramente frontend.
- Não mexer no fluxo de aprovações nem na fila do almoxarifado.

## Verificação

- Typecheck limpo após as edições.
- Preview: abrir `/requisicoes/nova-op`, selecionar OP com 2 componentes, enviar e conferir mensagem "Requisição N criada com 2 itens".
- Simular erro (SID desabilitado) e conferir que `detail` aparece na UI.
