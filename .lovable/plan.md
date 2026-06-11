# Impressão de OP — diagnosticar e degradar com elegância quando o backend falha

## Causa raiz

A mensagem "Nenhuma OP pôde ser carregada." aparece quando **todas** as chamadas a `/api/producao/ordem-producao/impressao` falham. Você confirmou que a aba Network mostra várias dessas chamadas estourando com CORS / 500 / timeout / Failed to fetch.

Ou seja: o frontend está fazendo a coisa certa — quem está caindo é o backend FastAPI (provavelmente ngrok limitando concorrência, OOM no servidor ao montar payload de desenho, ou um 500 cru que mata o request). Lovable não pode "consertar o backend"; o que dá pra fazer é:

1. parar de engolir o erro real e mostrar pro usuário;
2. evitar martelar o backend (concorrência menor + fail-fast);
3. dar ao usuário uma saída manual (tentar de novo só os que falharam, ou desligar desenhos pra reduzir payload).

## O que muda no frontend

### 1. Capturar e propagar o erro real

Hoje o `carregarOps` engole tudo com `catch {}` e só guarda `{cod_ori, num_orp}`. Vou guardar também `motivo` (mensagem do erro) e expor o **primeiro** erro de rede no toast/UI:

- "Não foi possível conectar ao backend (Failed to fetch). Verifique o ERP/ngrok."
- "O servidor retornou erro 500 em todas as OPs. Causa: <detail>."
- "Tempo de resposta excedido."

### 2. Fail-fast quando claramente é o backend que caiu

Se **todas** as OPs do **primeiro lote de concorrência** falharem (≥3 falhas seguidas, todas com erro de rede ou 5xx), abortar o loop imediatamente em vez de gastar 244 requests inúteis. Mostrar um diálogo:

```
Não foi possível carregar as OPs.
Motivo: Failed to fetch (5 OPs testadas falharam).
[ Tentar novamente ]  [ Tentar sem desenhos ]  [ Fechar ]
```

"Tentar sem desenhos" reexecuta forçando `incluir_desenhos=N` e `listar_desenho=N` — desenhos são quase sempre o que estoura tamanho/tempo no ERP via ngrok.

### 3. Reduzir agressividade

- Concorrência: cai de 6 → 3 quando `incluir_desenhos === "S"` (payload grande).
- Tentar 1 retry automático por OP só em caso de erro de rede transitório (`TypeError: Failed to fetch`).

### 4. Mostrar lista de falhas com botão "Tentar novamente só estas"

O bloco vermelho de falhas (já existe) ganha um botão que reprocessa apenas os `falhasLote` — útil quando 230 de 244 deram certo e só algumas estouraram.

## Detalhes técnicos

Arquivo único: `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`.

- Tipar `falhasLote` como `{ cod_ori: string; num_orp: string; motivo?: string }[]`.
- Em `carregarOps`:
  - capturar `err?.message`/`err?.status` no catch unitário;
  - depois do primeiro slice, se 100% falhou, retornar `{ ordens: [], falhas, abortado: true, motivoGlobal }`;
  - retry simples (1x) em erro de rede.
- Em `executarVisualizacao` / `gerarPdfCompleto`: se `abortado` ou `ordens.length === 0`, exibir o `motivoGlobal` no toast e popular `falhasLote` para a UI; nada de toast genérico.
- Acrescentar handler `retentarSemDesenhos(alvos)` chamado pelo diálogo.
- Acrescentar handler `retentarFalhas()` no bloco vermelho.
- POST `/impressao/lote`: manter como tentativa, mas tratar `Failed to fetch` distinto de 404/405 — se for `Failed to fetch` (rede), também abortar global ao invés de cair em N GETs.

## Fora de escopo

- Consertar o backend FastAPI / ngrok (não é Lovable).
- Mudar layout da tela.
- Mexer em "Imprimir todas" (já usa GET de lote por origem, fluxo diferente).
