## Escopo

Ajustar a tela `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` (passos 2 e 4) para trabalhar com o novo payload de componentes vindo de `GET /api/requisicoes/op/{codori}/{numorp}` e permitir escolher o Depósito de origem por item. Sem tocar em regras de negócio: apenas mapeamento de campos, UI de seleção de depósito e clareza do "Salvar rascunho".

## 1. Tipos e normalização (`src/types/requisicoes.ts` + `src/services/requisicoesApi.ts`)

Estender `ComponenteOP` com os campos limpos que o backend passou a devolver:

- `componente: string` (código já limpo — substitui uso de `codcmp` cru na UI)
- `transacao: number | null`
- `derivacao: string | null` (já existia como `codder`; expor também como `derivacao`)
- `qtd_disponivel_requisitar: number`
- `precisa_deposito: boolean`
- Manter `deposito: number | null` (agora vem null de propósito).

Ajustar `normalizeOpConsulta` para copiar esses campos do payload sem alterar a lógica de `pode_requisitar` / `motivo_bloqueio`.

## 2. Passo 2 — Selecionar componentes

- Substituir referências a `c.codcmp` na exibição por `c.componente` (fallback `codcmp`). Descrição/UM/Derivação/Transação/Disponível vêm dos novos campos.
- Coluna "Disponível" passa a usar `qtd_disponivel_requisitar`.
- Coluna "Depósito": se `precisa_deposito === true` e `deposito` está null, renderizar um `Select`/`Combobox` populado por `GET /api/requisicoes/lookup/depositos?q=&limit=100` (novo fetcher `buscarDepositos` em `requisicoesApi.ts`, com cache via TanStack Query). Sugerir depósito `"1"` como default pré-selecionado. O valor escolhido é guardado no estado local do wizard (`depositosPorItem: Record<number /*seqcmp*/, number>`).
- Remover `deposito ausente` da função `componenteInvalido` — item não é mais inválido por isso. Manter checagem apenas para `codetg`/`codcmp`/`unidade`.
- Tooltip de checkbox continua bloqueando só quando o item for realmente inválido.

## 3. Passo 4 — Revisão e envio

- Tabela de revisão mostra o depósito escolhido pelo usuário (`depositosPorItem[seqcmp] ?? c.deposito`).
- Ao montar o payload em `useMemo` (linha ~186) e em `enviar()` (linha ~230), usar o depósito escolhido em `deposito_origem`.
- Novo gate de envio: se algum item selecionado tiver `precisa_deposito` e nenhum depósito escolhido, desabilitar "Enviar requisição" com mensagem clara: `Escolha o depósito de origem do componente {componente}`. Banner acima dos botões lista os componentes pendentes.
- Ajustar o banner atual "Dados incompletos" para não mencionar mais `depósito` na lista de campos exigidos do backend.

## 4. "Salvar rascunho"

Como não existe `POST /api/requisicoes`, transformar o botão em rascunho **local**:

- Renomear para "Salvar rascunho (local)" com ícone e tooltip explicando que fica no navegador.
- Persistir `{ codori, numorp, tipo, itensSelecionados, depositosPorItem, depositoDestino }` em `localStorage` sob chave `requisicoes:rascunho:{codori}:{numorp}`.
- Ao abrir a tela com uma OP que tem rascunho salvo, oferecer botão "Restaurar rascunho".
- Remover qualquer texto/toast que sugira gravação no servidor.

## 5. Integração SID

Sem mudança de código. O chip "Desabilitada" continua vindo de `/api/requisicoes/sid/ping` e permanece até `SID_HABILITADO=S` + restart.

## Fora de escopo

- Backend / novos endpoints (usar apenas `/api/requisicoes/lookup/depositos` já existente).
- Fluxo "sem OP", Portal, e telas de aprovação.
- Alterar cálculos de disponibilidade.

## Verificação

- `tsgo` limpo.
- Preview: selecionar OP com componentes `precisa_deposito=true` → escolher depósito → botão "Enviar" habilita; deixar em branco → botão bloqueia com mensagem citando o componente.
- Rascunho local salva/restaura pelo `localStorage` sem chamada de rede.
