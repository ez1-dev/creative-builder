## Objetivo
Tratar corretamente os três status do endpoint `GET /api/contabil/modelos/{id}/resultado-pronto` (`CONCLUIDO`, `CACHE_APROXIMADO`, `SEM_CACHE`) em todos os consumidores, sem converter ausência de snapshot em R$ 0,00 e sem descartar snapshot aproximado.

## Escopo — consumidores identificados
- `src/hooks/contabil/api.ts` (`useResultadoPronto`, `select` que hoje só normaliza payload se `CONCLUIDO`)
- `src/types/contabil.ts` (`ResultadoProntoStatus`, `ResultadoProntoResponse`)
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` (DRE Studio e DRE/Balanço Padrão via `modoBloqueado`)
- `src/components/dre-studio/MaterializacaoDialog.tsx` (polling de job)
- `src/hooks/dashboardGeral/useContabilidade.ts` + `ContabilidadeTab.tsx` (cards Ativo/Passivo/PL/Resultado/Receita/Margem)
- `src/components/bi/financeiro/DreResumoCards.tsx` (se alimentado por payload contábil)
- Verificar `useVincularContasDRESenior`, `useVincularContasBalancoSenior`, `useContabilConfiguracao`, `unidadeCapabilities` (uso apenas para invalidação/config — sem mudança de UI esperada).

## Mudanças

### 1. Tipagem (`src/types/contabil.ts`)
- Ampliar `ResultadoProntoStatus` para `"CONCLUIDO" | "CACHE_APROXIMADO" | "SEM_CACHE"` (manter união com `string` só se necessário para compat).
- Adicionar em `ResultadoProntoResponse`:
  ```ts
  aviso_parametros?: {
    mensagem?: string | null;
    solicitado?: Record<string, unknown>;
    snapshot?: Record<string, unknown>;
    diferencas?: Array<{ parametro?: string; solicitado?: unknown; snapshot?: unknown }>;
  } | null;
  ```
- Sem remover campos existentes.

### 2. Resolvedor compartilhado
Criar `src/lib/contabil/resultadoProntoState.ts`:
- `resolveResultadoProntoState(meta)` retornando `{ temResultado, aproximado, semCache }`.
- `getParameterDifferences(solicitado, snapshot)` para fallback quando `diferencas` não vier.
- Utilitário `podeExibirValor(meta)` = `CONCLUIDO || CACHE_APROXIMADO`.

### 3. Hook `useResultadoPronto` (`src/hooks/contabil/api.ts`)
- Normalizar payload **também** em `CACHE_APROXIMADO` (hoje só normaliza em `CONCLUIDO`, o que faz o snapshot aproximado ser jogado fora).
- Propagar `aviso_parametros` em `ResultadoProntoMeta`.
- Manter `queryKey` já contendo os filtros que definem o snapshot (verificar que `aplicar_referencia_senior`, `expandir_resultado_exercicio`, `fonte_saldo`, `codemp`, `codfil`, período estão no `filtros` — se algum faltar, incluir).

### 4. Badge/alerta compartilhado
Novo componente `src/components/dre-studio/SnapshotAproximadoBadge.tsx`:
- Ícone + texto "Snapshot aproximado" (não depende só de cor).
- Popover com `aviso_parametros.mensagem` (ou texto padrão) + área expansível "Ver diferenças" listando cada `{ parametro, solicitado, snapshot }`.
- Botão "Regerar com parâmetros atuais" (callback recebido via prop).
- Tooltip/aria-label para leitor de tela.

### 5. `DreStudioVisualizacaoPage.tsx`
- Substituir as checagens pontuais `q.meta?.status === "SEM_CACHE"` por `resolveResultadoProntoState(q.meta)`.
- Fluxo de render da grade:
  - `temResultado` → renderiza a matriz normalmente (também para aproximado).
  - `aproximado` → renderiza matriz **+** `SnapshotAproximadoBadge` acima; botão "Regerar" reaproveita `executarTudoAutomatico` / fluxo assíncrono atual (nenhum cálculo novo).
  - `semCache` → mantém o estado vazio atual (bloco de "Resultado ainda não materializado" e ações Gerar/Alterar período).
- Depois de regerar, se `q.meta.status` continuar `CACHE_APROXIMADO`, manter o badge com a mensagem "O resultado foi atualizado, mas ainda não existe correspondência exata para todos os parâmetros selecionados."
- Nas transições de filtro, manter `placeholderData` já existente mas anexar rótulo "Atualizando resultado..." e exibir o badge quando o novo retorno for aproximado.

### 6. Dashboard Geral — cards contábeis
- `useContabilidade.ts` hoje consome `getBalancoPatrimonial` e `fetchDreRealizadoResumo`. Ajuste:
  - Se essas respostas trouxerem `status` do contrato `resultado-pronto` (verificar no `select`/schemas), propagar `meta.status` para o `ContabilidadeData` (novo campo `snapshotStatus`).
  - Se **não** trouxerem, adicionar uma leitura complementar via `useResultadoPronto` com os mesmos parâmetros (modelo padrão DRE / modelo padrão Balanço) só para obter o status e alimentar os cards.
- `ContabilidadeTab.tsx` (`Ativo`, `Passivo`, `PL`, `Resultado exerc.`, `Receita`, `Margem %`) e `DreResumoCards.tsx`:
  - `CONCLUIDO` / `CACHE_APROXIMADO` → mostrar valor (mesmo quando 0 → "R$ 0,00" é válido).
  - `CACHE_APROXIMADO` → renderizar `SnapshotAproximadoBadge` compacto no cabeçalho da seção (não em cada KpiCard) com ação "Regerar" (dispara materialização do modelo padrão + `queryClient.invalidateQueries`).
  - `SEM_CACHE` → substituir o valor do KpiCard por texto "Resultado ainda não gerado" / "Sem resultado gerado" e mostrar ação "Gerar resultado". `KpiCard` recebe uma nova prop `emptyLabel` (ou renderiza um `EmptyKpiCard` alternativo) para evitar hardcode.

### 7. `MaterializacaoDialog.tsx`
- Após conclusão (`CONCLUIDO`), invalidar como já faz.
- Se após conclusão o refetch trouxer `CACHE_APROXIMADO`, o badge permanece na página (nenhuma mudança no dialog em si além de aceitar esse estado como "sucesso funcional").

### 8. Erros HTTP
Ajustar mapa de erro no hook/página para distinguir:
- 200 + qualquer um dos três status = resposta válida (não é "API offline").
- 409 → "Configuração/materialização pendente".
- 404 → "Modelo não encontrado".
- 500 → "Erro interno".
- Timeout / falha de rede → "API indisponível".
Manter mensagens já existentes para os casos conhecidos; só evitar rotular `SEM_CACHE`/`CACHE_APROXIMADO` como erro.

### 9. Não mexer
Fórmulas DRE, estrutura Balanço, saldos, referência Senior, drills, contas vinculadas, materialização, modelo padrão, endpoints de gravação.

## Critérios de aceite
- **A (CONCLUIDO)**: valores normais, sem badge, sem botão obrigatório de regerar.
- **B (CACHE_APROXIMADO)**: valores reais exibidos (nunca R$ 0,00 por causa do status), badge "Snapshot aproximado", diferenças consultáveis, botão "Regerar com parâmetros atuais" que dispara o fluxo assíncrono já existente e invalida `["contabil","resultado-pronto",...]`.
- **C (SEM_CACHE)**: sem R$ 0,00, estado vazio com botão "Gerar resultado", filtros preservados.
- Todos os cards contábeis do Dashboard Geral (Ativo, Passivo, PL, Resultado DRE, Receita, Margem) seguem o mesmo comportamento — nenhum card zerando enquanto outro trata corretamente.
- Zero contábil legítimo (`CONCLUIDO`/`CACHE_APROXIMADO` com valor 0) continua sendo mostrado como "R$ 0,00".