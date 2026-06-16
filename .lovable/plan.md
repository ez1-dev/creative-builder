# Plano — Histórico do GS / Reserva OP Complementar

Adicionar uma nova seção/tela em `src/pages/NumeroSeriePage.tsx` (logo abaixo do card "OP Complementar — Manter GS") para consulta de histórico do GS e validação pós-execução. Sem mudanças em outras telas.

## 1. Validação pós-execução (no card existente)

Estender `ResultadoOpComplementar` (mesmo arquivo) com os campos retornados pela API após `manter-gs`:

```ts
vinculo_confirmado?: boolean;
pedido?: number;
item_pedido?: number;
produto_op_nova?: string;
validacoes?: {
  e120ipd_confirmado?: boolean;
  usu_tnsop_confirmado?: boolean;
  e000cse_confirmado?: boolean;
  historico_estoque_encontrado?: boolean;
};
```

Após sucesso da execução `manter-gs`, renderizar abaixo do toast, dentro do card de resultado:

- `vinculo_confirmado === true` → `<Alert>` verde: "Vínculo confirmado. O GS está reservado na OP nova."
- `vinculo_confirmado === false` → `<Alert variant="destructive">`: "Reserva não confirmada. O GS não foi localizado no item do pedido da OP nova."
- `validacoes.historico_estoque_encontrado === true` → `<Alert>` amarelo: "GS encontrado no histórico do ERP e reaproveitado para a OP complementar."
- Grid com 4 badges (verde/cinza) para cada flag em `validacoes`.

Regras já vigentes mantidas: `forcar_vinculo=false` no fluxo normal; só `true` após o `AlertDialog` quando o GS não existir em nenhuma fonte.

## 2. Nova seção "Histórico do GS"

Card novo após o de OP Complementar, com filtros e `Tabs` (4 abas).

### Filtros (linha superior)
- `GS` (input texto)
- `OP nova` (input numérico)
- `Origem OP nova` (default "250")
- `Produto` (input)
- `Período` (date range — `DateRangeFilter`)
- `Situação do vínculo` (`SelectFilter`: Encontrado / Reservado / Vinculado / Pendente / Erro / Todos)
- Botão "Consultar" → `GET /api/numero-serie/gs-historico` com os filtros como query params.

Estado: `histLoading`, `histData: HistoricoGsResponse | null`, `histErro`.

### Tipo de resposta esperada

```ts
interface HistoricoGsResponse {
  resumo: { numero_serie; fonte; produto_origem; derivacao_origem;
            produto_op_nova; derivacao_op_nova; status };
  reserva: { codigo_empresa; origem_op_nova; numero_op_nova; numero_pedido;
             item_pedido; produto_op_nova; derivacao; numsep_e120ipd;
             data_reserva; usuario; justificativa } | null;
  movimentacoes: Array<{ data_movimento; produto; derivacao; deposito;
                         transacao; tipo: 'E'|'S'; quantidade;
                         origem_op; numero_op; fonte: 'E210MVP'|'E210DLS' }>;
  validacao: { e120ipd_confirmado; usu_tnsop_confirmado;
               e000cse_confirmado; e900_confirmado };
}
```

### Aba 1 — Resumo do GS
Grid de chave/valor com badges para GS, fonte, produto/derivação origem, produto/derivação OP nova e `StatusBadge` para status.

### Aba 2 — Reserva atual
Grid de chave/valor com os campos da `reserva`. Se `null`, exibir empty state "Nenhuma reserva ativa para este GS".

### Aba 3 — Histórico de movimentações
`DataTableBI` com colunas: Data, Produto, Derivação, Depósito, Transação, E/S (badge), Quantidade (formatada), Origem/OP, Fonte (badge `E210MVP`/`E210DLS`). Empty state se vazio.

### Aba 4 — Validação técnica
Lista de 4 itens com ícone verde/vermelho:
- `E120IPD.USU_NUMSEP`
- `USU_TNSOP.USU_NUMSEP`
- `E000CSE.NUMSEP`
- `E900COP / E900QDO`

## 3. Integração com o fluxo de reserva

Após `executarOpComplementar` em modo `manter-gs` retornar sucesso:
- Pré-preencher os filtros do histórico com `numero_serie` e `numero_op_nova` retornados.
- Disparar automaticamente a consulta de histórico para o usuário já ver as 4 abas.

## 4. Fora de escopo
- Backend FastAPI (deve expor `/api/numero-serie/gs-historico` e enriquecer a resposta de `manter-gs` com `vinculo_confirmado` + `validacoes`).
- Lovable Cloud.
- Outras seções da página.

## 5. Documentação
Adicionar `docs/backend-numero-serie-gs-historico.md` com:
- Contrato da rota `GET /api/numero-serie/gs-historico` (filtros + resposta acima).
- Campos extras esperados na resposta de `POST /api/numero-serie/op-complementar/manter-gs` (`vinculo_confirmado`, `pedido`, `item_pedido`, `produto_op_nova`, `validacoes.*`).
- Regras de comportamento descritas pelo usuário (mensagens verde/vermelha/amarela, `forcar_vinculo` apenas com confirmação extra).

## Validação
- Build TS verde.
- Após reservar um GS, o card mostra o `Alert` verde/vermelho conforme `vinculo_confirmado`, badges de validação e dispara automaticamente a consulta de histórico.
- Trocar filtros e clicar em "Consultar" atualiza as 4 abas.
- Mocks/respostas vazias renderizam empty states sem quebrar.
