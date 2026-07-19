
# Teste guiado do fluxo SID (requisitar → conferir → excluir)

Objetivo: validar de ponta a ponta o `SID_HABILITADO=S` disparando duas chamadas controladas no 8070 e confirmando o efeito no ERP Senior, sem tocar em produção.

## Pré-checks (antes de qualquer POST)

1. `GET /api/requisicoes/sid/ping` — abortar se `sid_habilitado !== true` ou se algum `wsdl_ok !== true`. Registrar `sid_ger_operacao` e as duas URLs de serviço no retorno pra auditoria.
2. Confirmar identidade do chamador via `has_role(auth.uid(), 'admin')` na edge function; qualquer outro papel recebe 403.

## Payload do teste (baixo valor, alinhado ao combinado)

- Componente: **CHA022**
- Quantidade: **1**
- TNS: **90250**
- Depósito: **1**
- OP de origem: campo `codori`/`numorp` a confirmar com você antes do disparo (uso proposto: a mesma OP que já validamos no autocomplete pra facilitar a conferência no ERP).

## Fluxo automatizado

```text
[Preview admin] ──► edge fn `sid-teste-guiado` ──► ngrok 8070
                                    │
                                    ├─ 1) POST /api/requisicoes/sid/requisitar
                                    │       └─ captura numeme + payload bruto
                                    ├─ 2) pausa manual (você confere no ERP)
                                    └─ 3) POST /api/requisicoes/sid/excluir
                                            └─ confirma remoção
```

A edge function é **admin-only**, roda em duas etapas separadas (`step: "requisitar" | "excluir"`) pra você abrir o Senior entre elas, e devolve sempre o JSON cru do 8070 mais os headers relevantes.

## Entregáveis

1. Nova edge function `sid-teste-guiado` (Cloud) com:
   - Validação de admin.
   - `step=requisitar`: chama `/sid/ping`, valida flags, chama `/sid/requisitar` com o payload acima, persiste o retorno em `sid_teste_execucoes` (nova tabela admin-only) e devolve `{ ok, numeme, raw }`.
   - `step=excluir`: recebe `numeme` (ou lê da última execução aberta), chama `/sid/excluir` e atualiza a linha correspondente.
2. Tabela `sid_teste_execucoes` (admin-only, RLS + GRANT completos) com colunas: `id`, `created_at`, `created_by`, `payload_req`, `resposta_requisitar`, `numeme`, `resposta_excluir`, `status` (`aberto`/`excluido`/`erro`).
3. Painel mínimo em `/requisicoes/teste-sid` (a página já existe, admin-only): dois botões (“Requisitar” e “Excluir”), histórico das últimas execuções e JSON bruto expandível.
4. Após o retorno real do primeiro `requisitar`, ajusto o parser do `numeme` no endpoint definitivo `POST /api/requisicoes/nova-op` (frontend + serviço) caso o campo venha em nome/local diferente do assumido hoje.

## Passo a passo que você vai ver na tela

1. Abrir `/requisicoes/teste-sid` como admin.
2. Clicar **Disparar requisição SID (CHA022 · 1 · TNS 90250 · Dep 1)**.
   - UI mostra: status HTTP, `numeme`, JSON completo, link “Copiar payload”.
3. Abrir o Senior → Estoque → Requisições e localizar o `numeme` retornado. Você confirma manualmente.
4. Voltar na tela e clicar **Excluir requisição de teste**.
   - UI mostra: status HTTP e JSON de retorno.
5. Reabrir o Senior e confirmar a exclusão.

## Detalhes técnicos

- Edge function usa `Deno.env.get('ERP_API_URL')` (fallback: `app_settings.erp_api_url`) + login `RENATO/123` já usado no fluxo atual, com header `ngrok-skip-browser-warning: true`.
- Nenhuma alteração em `/api/requisicoes/nova-op` até termos o retorno real em mãos — só ajuste de parser depois da observação.
- Logs de cada chamada gravados em `error_logs` quando `status >= 400` pra manter o padrão do projeto.
- Sem impacto em regras de negócio existentes, só leitura/escrita da nova tabela e chamadas SID controladas.

## Fora do escopo deste plano

- Refatorar o endpoint definitivo `nova-op` (fica pra próximo turno, dependente do payload real).
- Qualquer teste em massa ou automação recorrente — este fluxo é pontual, disparado sob demanda pelo admin.
