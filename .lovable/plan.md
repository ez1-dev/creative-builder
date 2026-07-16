## Objetivo

Ajustar o frontend da aba "ERP Nativo" do Monitor de Telas para tratar `NOMUSU` como identidade principal e `CODUSU` como opcional, sem recalcular contagens no cliente. Backend (FastAPI 8070) já entrega os agregados corretos e resolve o de-para; o React apenas consome.

## Arquivos alterados

### 1. `src/lib/navegacaoTelemetriaApi.ts`
- Adicionar helper exportado `getUsuarioLabel({ nomusu, codusu })` com a regra:
  - `login (codusu)` quando ambos preenchidos
  - `login` quando só o login
  - `Usuário {codusu}` quando só o código
  - `"Não identificado"` como fallback final
- Ampliar `HistoricoTelaRow` para expor os campos nativos: `nomusu?: string|null`, `codusu?: number|string|null`, `sig_processo?: string|null`, `nome_tela?: string|null`, `descricao_tela?: string|null`, `codemp?`, `codfil?`, `evento?`, `origem?`. Nenhum campo torna-se obrigatório.
- Em `TelemetriaRankingRow` adicionar `nomusu?: string|null` e `codusu?: number|string|null` (opcionais) para permitir uso futuro/ranking por usuário quando o backend devolver.
- `fetchHistoricoTela` (branch `nativo`) já usa `cod_tela`+`dias`; apenas garantir que o parâmetro `usuario_filtro` de `TelemetriaFiltros` continua sendo enviado como string livre (já é — nenhum cast numérico).

### 2. `src/components/monitor-telas/HistoricoTelaModal.tsx`
Reformular a tabela quando `origem === 'nativo'` para o novo contrato solicitado, mantendo o layout web atual.

Colunas nativo:
`Data/Hora | Usuário | Código | Tela/Processo | Sigla | Evento | Empresa | Filial | Origem | Detalhes`

- **Usuário** = `r.nomusu || "Não identificado"` (nunca é substituído pelo código).
- **Código** = `r.codusu ?? "—"` (linha não é escondida quando nulo).
- **Tela/Processo** = `r.nome_tela || r.descricao_tela || r.sig_processo || "Tela não identificada"`.
- **Sigla** = `r.sig_processo ?? "—"`.
- **Evento** = badge com `r.evento ?? r.acao ?? "-"`.
- **Empresa/Filial** = `r.codemp`, `r.codfil` (ou "—").
- **Origem** = `r.origem ?? "-"`.
- **Detalhes** = `r.observacao ?? "-"` (truncar visualmente, tooltip com valor completo).

Estados textuais atualizados:
- carregando: "Carregando telemetria do ERP..."
- vazio: "Nenhum evento nativo encontrado para os filtros selecionados."
- erro: "Não foi possível carregar a telemetria nativa." + `<details>` expansível com o `err`.

O modo web continua exatamente como está hoje.

### 3. `src/components/monitor-telas/MonitorTelasTab.tsx`
- Não recalcular usuários únicos localmente. O card "Usuários Ativos" segue usando `resumo.data?.usuarios_ativos` (já é assim). Adicionar comentário curto proibindo `new Set(...codusu)`.
- Quando o backend passar a devolver `nomusu` em `TelemetriaRankingRow` (ranking de usuários futuro), usar `getUsuarioLabel`. O ranking atual continua sendo de telas — nada muda visualmente aqui.
- Ranking de telas: prioridade continua sendo `nome_tela`, com fallback `sig_processo` (regra já existente, mantida — apenas confirmar via `nomeTela()`).

### 4. `src/pages/MonitorTelasPage.tsx`
- Placeholder do filtro `Usuário`: "Login ou código do usuário" (hoje é "Login ou email").
- Nenhum cast para número; o valor segue como string e é aplicado em `applied.usuario_filtro`, que a API já injeta como `usuario_filtro` (contrato do backend inalterado).

### 5. Cache
Como o projeto não usa TanStack Query nesta tela (é `useState` + `fetch*` diretos, com `reloadKey` disparando reload), a "invalidação pós-restart" já é coberta pelo botão **Atualizar** existente na `MonitorTelasPage`. Não introduzir React Query só para isso. Apontar isso ao usuário na entrega e recomendar clicar em "Atualizar" após o restart da 8070.

## Fora do escopo (não mexer)

Backend Python, regra LSP, R999USU, `src/integrations/supabase/*`, autenticação, base URL da API, `DeParaTelasModal`, `AnaliseIaCard`, aba Portal Web.

## Validação pós-restart (manual, pelo usuário)

1. Evento com `nomusu` + `codusu` → coluna Usuário = login, Código = número.
2. Evento com `codusu = null` → Usuário = login, Código = "—", linha permanece visível.
3. Filtro por login (`adenir.santin`) retorna eventos.
4. Filtro por código numérico retorna os mesmos eventos.
5. Card "Usuários Ativos" > 0 quando houver eventos só com NOMUSU.
6. Ranking com dois logins diferentes e CODUSU nulo aparece como duas linhas (garantido pelo backend; frontend só renderiza).

## Entregáveis do relato final
Arquivos alterados, tipos atualizados, componentes do filtro/tabela/ranking, exemplo do payload, confirmação de NOMUSU como identidade principal, confirmação de que CODUSU nulo não elimina o usuário, e instrução de clicar em "Atualizar" após o restart da 8070 para dispensar respostas cacheadas na sessão.
