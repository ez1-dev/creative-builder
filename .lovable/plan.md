## Contexto

O prompt consolidado corresponde ao que já foi implementado nas últimas rodadas (mapeamento `raw.op.*`, campos limpos de componentes, `precisa_deposito`, lookups em `/api/requisicoes/lookup/*`, autocompletes de CC/Projeto/Componente com UM read-only, chip SID via `/sid/ping`, rascunho local). Este plano re-emite apenas as lacunas de terminologia e tratamento de erro que fecham 100% da spec.

## 1. Renomear "Depósito de origem" → "Depósito sugerido"

Arquivo: `src/pages/requisicoes/NovaRequisicaoOpPage.tsx`.

- Trocar o cabeçalho da coluna do Passo 2 e o label do `Select` de "Depósito de origem" para **"Depósito sugerido"**.
- Ajustar textos de gating e toasts para: *"Escolha o depósito sugerido do componente {codigo}."*
- Adicionar aviso discreto (helper text no rodapé da tabela e no Passo 4): *"O depósito definitivo é definido pelo ERP no momento do atendimento."*
- Espelhar no Passo 4 (revisão) — coluna passa a "Dep. sugerido"; sidebar/resumo idem.
- Manter o payload como `deposito_origem` (contrato atual do backend).

## 2. Tratamento do retorno de `POST /sid/requisitar`

Arquivo: `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` (função `enviar`). `src/services/requisicoesApi.ts` já lança `RequisicaoApiError` com `detail` para 4xx — sem mudanças.

Comportamento:

- **Sucesso com `numeme` numérico**: toast `"Requisição {numeme} criada no ERP."` (fallback para `resultado` se `numeme` ausente).
- **Sucesso com `numeme: null` + `aviso_parse`**: toast neutro *"Requisição enviada — confira o número no ERP."* Não inventar número.
- **HTTP 400 (`RequisicaoApiError`)**: toast destrutivo com título **"ERP recusou a requisição"** e `err.detail` (ou `err.message`) integral. Não limpar o formulário.
- **HTTP 503 (`IntegracaoDesabilitadaError`)**: mantém comportamento atual.
- Remover qualquer caminho que trate 200 como sucesso ignorando `detail`.

## 3. "Salvar rascunho (local)" — reforçar rótulo

- Confirmar botão como **"Salvar rascunho (local)"** com tooltip *"Salva apenas neste navegador. O ERP não é notificado."*
- Remover toast/label residual que diga só "Rascunho salvo".

## 4. Verificação

- `tsgo` limpo.
- Preview `/requisicoes/nova-op`:
  - Coluna e mensagens de gating usam "Depósito sugerido" + disclaimer visível.
  - OP inválida (ex.: usuário inativo) → toast com `detail` do ERP, requisição não é dada como criada.
  - OP válida → toast "Requisição {numeme} criada no ERP."
  - Rascunho salva/restaura via localStorage com rótulo "local".

## Fora de escopo

- Backend/SID (já pronto).
- Fluxo "sem OP", Portal, Aprovações, Almoxarifado.
- Renomear campo no payload (`deposito_origem`) — mantido para não quebrar contrato.
