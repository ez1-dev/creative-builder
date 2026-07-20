## Contexto

A maior parte da spec já está implementada (mapeamento `raw.op.*`, campos limpos de componentes, `precisa_deposito`, lookups em `/api/requisicoes/lookup/*`, autocompletes de CC/Projeto/Componente com UM read-only, chip SID a partir do `/sid/ping`, rascunho local). Este plano trata só das **lacunas** contra o novo prompt.

## 1. Renomear "Depósito de origem" → "Depósito sugerido"

Arquivo: `src/pages/requisicoes/NovaRequisicaoOpPage.tsx`.

- Trocar o cabeçalho da coluna do Passo 2 e o label do `Select` de "Depósito de origem" para **"Depósito sugerido"**.
- Ajustar textos de gating e toasts para: *"Escolha o depósito sugerido do componente {codigo}."*
- Adicionar aviso discreto (helper text abaixo da coluna ou nota no rodapé da tabela e no Passo 4): *"O depósito definitivo é definido pelo ERP no momento do atendimento."*
- Espelhar a mesma mudança no Passo 4 (revisão) — coluna passa a se chamar "Dep. sugerido" e sidebar/resumo passam a exibir o rótulo novo.

Sem mudar o payload enviado (segue como `deposito_origem`), pois é o contrato atual do backend.

## 2. Tratamento do retorno de `POST /sid/requisitar`

Arquivo: `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` (função `enviar`) e, se necessário, `src/services/requisicoesApi.ts` (não precisa mudar — o `handleResponse` já joga `RequisicaoApiError` com `detail` para 4xx).

Comportamento novo:

- **Sucesso com `numeme` numérico**: exibir toast de sucesso `"Requisição {numeme} criada no ERP."` (usando `resultado` como fallback se `numeme` vier ausente mas `resultado` estiver preenchido) e navegar/limpar como hoje.
- **Sucesso com `numeme: null` + `aviso_parse`**: toast neutro *"Requisição enviada — confira o número no ERP."* Não inventar número, não marcar como erro.
- **Erro HTTP 400 (`RequisicaoApiError`)**: exibir `err.detail` (ou `err.message`) integralmente ao usuário via toast destrutivo com título "ERP recusou a requisição" e **não** limpar o formulário. Continuar tratando `IntegracaoDesabilitadaError` (503) como está.
- Remover qualquer lógica que hoje considera resposta 200 sempre como sucesso ignorando `detail`.

## 3. "Salvar rascunho" — reforçar rótulo "local"

Já grava em `localStorage`. Ajustes mínimos:

- Confirmar que o botão está rotulado **"Salvar rascunho (local)"** com tooltip *"Salva apenas neste navegador. O ERP não é notificado."*
- Remover toast/label residual que ainda diga apenas "Rascunho salvo" sem indicar que é local.

## 4. Verificação

- `tsgo` limpo.
- Preview `/requisicoes/nova-op`:
  - Coluna e mensagens de gating usam "Depósito sugerido" + disclaimer visível.
  - Enviar OP inválida (ex.: usuário inativo) → toast mostra `detail` do backend, requisição não é dada como criada.
  - Enviar OP válida → toast "Requisição {numeme} criada no ERP."
- Sem tocar em regras de negócio, cálculos ou endpoints.

## Fora de escopo

- Backend/SID (já pronto).
- Fluxo "sem OP", Portal, Aprovações, Almoxarifado.
- Renomear campo no payload (`deposito_origem`) — mantido para não quebrar contrato.
