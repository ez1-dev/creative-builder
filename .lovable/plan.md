
## Contexto

As colunas **Nome / Atalho / Módulo** já são exibidas no Ranking, na tabela de Eventos e em Sem Uso da página `MonitorErpNativoPage.tsx`, e o modal de-para com edição inline (`DeParaMonitorErpModal`) e o popover `EdicaoTelaPopover` já existem. Faltam dois ajustes:

1. **Contrato do backend novo** — o POST agora recebe `cod_form` (não `tela`) e as pendentes retornam `modulo_sugerido` (não `modulo`). O frontend atual envia/lê `tela`/`modulo`.
2. **Seção visível "Telas sem nome"** — hoje isso só existe como aba dentro do modal; o pedido é uma seção/aba na própria página.

Nada muda em backend, endpoints, cálculos ou regras. Só ajustes de frontend.

---

## Mudanças

### 1) `src/lib/monitorErpNativoDeparaApi.ts` — alinhar contrato

- Renomear no tipo `DeParaTelaPendente`: `modulo` → `modulo_sugerido` (mantendo `tela`, `tabela`, `gravacoes`, `ultimo_dia`).
- `upsertDeParaMonitorErp` passa a enviar `cod_form` (valor de `input.tela`) no lugar de `tela`. Payload final: `{ cod_form, nome_tela, atalho, modulo, ativo, obs }`. Mantemos `ativo`/`obs` porque a UI de mapeadas já os usa; o backend ignora extras se não aceitar.
- `fetchDeParaMonitorErp` continua igual, apenas normalizando ambos os formatos (`modulo_sugerido ?? modulo`) para o campo `modulo_sugerido` nas pendentes.

### 2) `src/components/monitor-erp-nativo/DeParaMonitorErpModal.tsx`

- Ler `row.modulo_sugerido` como valor inicial da coluna Módulo na aba "A mapear" (pré-preenche o input do módulo com a sugestão do backend).
- Nenhuma outra mudança visual.

### 3) `src/pages/MonitorErpNativoPage.tsx` — nova aba "Telas sem nome"

- Adicionar uma aba `sem-nome` ao lado das existentes (Ranking / Eventos / Sem Uso).
- Conteúdo: tabela lida de `GET /api/monitor-erp-nativo/depara` → `nao_mapeadas`, colunas **Tela (código)**, **Tabela**, **Módulo sugerido**, **Gravações** (ordenada desc), **Última mov.**, e botão **Nomear**.
- **Nomear** abre o `DeParaMonitorErpModal` já existente na aba "A mapear" (reaproveitando o fluxo). Após `onSaved`, recarrega o ranking e a lista de sem-nome via `refetch`.
- Badge com contagem de pendentes no título da aba.

### 4) Sem mudanças em

- `monitorErpNativoApi.ts` (ranking/buscar/sem-uso já leem `nome_tela`/`atalho`/`modulo`).
- `EdicaoTelaPopover` (já usa `upsertDeParaMonitorErp`, herda a mudança de `cod_form` automaticamente).

---

## Arquivos alterados

- `src/lib/monitorErpNativoDeparaApi.ts` — tipos + payload.
- `src/components/monitor-erp-nativo/DeParaMonitorErpModal.tsx` — pré-preenche módulo com `modulo_sugerido`.
- `src/pages/MonitorErpNativoPage.tsx` — nova aba "Telas sem nome" com carregamento independente e botão Nomear.

## Validação

- Abrir Monitor → aba "Telas sem nome" lista pendentes ordenadas por gravações.
- Clicar "Nomear" → modal abre em "A mapear" com módulo pré-preenchido → salvar → toast + lista recarrega.
- Confirmar via aba Network que o POST envia `cod_form` (não `tela`).
