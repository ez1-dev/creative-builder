## Por que a integração aparece "Desabilitada"

O chip **Integração: Desabilitada** e o banner amarelo ("A integração com o ERP está desabilitada. A requisição será salva como pendente de integração.") são acionados por `sidWrite.enabled = false`, que vem de `GET /api/requisicoes/sid/ping` retornando `sid_habilitado: false`.

Isso é **intencional** — o backend FastAPI :8070 está com a flag `SID_HABILITADO=N` no `.env`. Enquanto essa flag não for virada para `S` e o serviço reiniciado, todo `POST /api/requisicoes/sid/*` é bloqueado com 503 antes mesmo de chegar no ERP. Por isso o botão **Enviar requisição** fica desabilitado — está funcionando como projetado (gate de segurança).

Nesse estado, a única ação disponível deveria ser **Salvar rascunho** (grava a requisição no backend em status "pendente de integração", sem falar com o SID).

## Por que o "Salvar rascunho" falhou com "Informe ao menos um item válido"

Essa mensagem **não vem do frontend** — vem do backend (`POST /api/requisicoes`). Olhando o print:

- Sidebar mostra 1 item, quantidade 4, "Sem saldo: 1".
- Na tabela de revisão as colunas **Descrição** e **Dep. origem** aparecem como `—`, mesmo o item tendo sido encontrado (`comps.find(...)` achou, senão o resumo não teria contado).

Isso indica que a resposta de `GET /api/requisicoes/op/{codori}/{numorp}` está devolvendo o componente **BR125-G** com `descricao = null` e `deposito = null` (e provavelmente `codetg`/`codcmp` também nulos ou incompletos). Como o `buildPayload` copia esses campos direto do componente:

```ts
codetg: comp.codetg,
codcmp: comp.codcmp,
codder: comp.codder,
unidade: comp.unidade,
deposito_origem: comp.deposito,
```

o payload enviado tem chaves obrigatórias vazias, e o validador do FastAPI descarta o item, sobrando `itens: []` na visão dele — daí o erro **"Informe ao menos um item válido"**.

Ou seja, são dois problemas independentes:

1. **SID desligado** (esperado, aguardando flip do `.env`).
2. **Componente da OP 110/1969 vem incompleto** do endpoint de consulta de OP — o item aparece na tela mas sem os campos-chave que o POST exige.

## Plano de correção

### Etapa 1 — Confirmar o payload que o backend rejeita
- Abrir DevTools → Network → repetir "Salvar rascunho" e capturar:
  - Resposta de `GET /api/requisicoes/op/110/1969` (ver quais campos do componente vêm `null`).
  - Corpo do `POST /api/requisicoes` e o `detail` completo da resposta 4xx.
- Isso confirma se o culpado é `codcmp`/`codetg` nulos, `unidade` faltando, ou outro campo.

### Etapa 2 — Endurecer o frontend contra componente incompleto
Em `src/pages/requisicoes/NovaRequisicaoOpPage.tsx`:
- Em `buildPayload`, validar antes de enviar: se `!comp.codcmp || !comp.codetg || comp.deposito == null`, marcar o item como inválido e bloquear o envio com mensagem específica ("Componente BR125-G está sem código de estágio/depósito — recarregue a OP ou contate o backend").
- Não permitir que o item apareça marcável no Step 2 se ele vier sem `codcmp`/`codetg` (desabilitar checkbox + tooltip explicando).
- Na tabela de revisão, se `descricao`/`deposito` estiverem vazios, exibir um badge vermelho "Dados incompletos" em vez de `—`, para o usuário não achar que é só cosmético.

### Etapa 3 — Registrar no docs do backend
- Anotar em `docs/` (novo arquivo `backend-requisicoes-op-consulta-campos-obrigatorios.md`) quais campos o `GET /api/requisicoes/op/{codori}/{numorp}` precisa devolver preenchidos para o `POST /api/requisicoes` aceitar o item: `codemp, codfil, codori, numorp, codetg, seqcmp, codcmp, unidade, deposito`.
- Servirá de referência para o time do backend corrigir a query que hoje devolve `descricao`/`deposito` nulos para essa OP.

### Etapa 4 — Aguardar `SID_HABILITADO=S`
Sem alterações de código do nosso lado. Assim que o `.env` for atualizado e o serviço reiniciado, o chip vira "Habilitada", o botão **Enviar requisição** libera e o fluxo completo (criar + `sid/requisitar`) passa a rodar.

## Detalhes técnicos

- **Arquivos afetados na Etapa 2:** `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` (funções `buildPayload`, `renderStep2`, `renderStep4`).
- **Nada muda em** `src/services/requisicoesApi.ts` — o normalizador já preserva `null` fielmente; o problema é dado ausente na origem.
- **Nada muda em regra de negócio nem em cálculo** — apenas validação e feedback visual.

## Fora do escopo

- Alterar o `SID_HABILITADO` (é operação de infra, não código).
- Corrigir a query do backend que popula `descricao`/`deposito` (é responsabilidade do FastAPI, apenas documentamos).
