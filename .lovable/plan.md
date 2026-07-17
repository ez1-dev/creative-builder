## Objetivo

Enriquecer a página `/monitor-erp-nativo` com os novos campos vindos do backend (`nome_tela`, `atalho`, `modulo`) e permitir manter o de-para diretamente na interface (modal + edição inline), sem tocar em backend, banco ou contratos.

## 1. Tipagem e API client (`src/lib/monitorErpNativoApi.ts`)

Estender os tipos existentes com os novos campos opcionais retornados pelo backend:

- `MonitorErpRankingTela`: `nome_tela?`, `atalho?`, `modulo?` (já existe `tela`, `tabela`).
- `MonitorErpEvento`: `nome_tela?`, `atalho?`, `modulo?`.
- `MonitorErpSemUso`: `nome_tela?`, `atalho?`, `modulo?`.

Adicionar novo módulo de manutenção `src/lib/monitorErpNativoDeparaApi.ts` cobrindo os endpoints `/api/monitor-erp-nativo/depara`:

```ts
GET  /api/monitor-erp-nativo/depara
  → { mapeadas: DeParaTelaErp[], nao_mapeadas: DeParaTelaPendente[] }

POST /api/monitor-erp-nativo/depara
  body: { tela, nome_tela, atalho, modulo, ativo, obs? }
```

`DeParaTelaErp` = `{ tela, nome_tela, atalho, modulo, ativo, obs }`.
`DeParaTelaPendente` = `{ tela, tabela?, gravacoes?, ultimo_dia? }`.

> Se o contrato real usar outra chave (ex.: `tela+tabela`) ou outros nomes, alinho no primeiro build — só ajustar o tipo/payload nesse arquivo, sem impactar a UI.

## 2. Novo modal — `src/components/monitor-erp-nativo/DeParaMonitorErpModal.tsx`

Modal dedicado seguindo o padrão do `DeParaTelasModal` já existente:

- Aba "A mapear" — telas capturadas na auditoria mas ainda sem `nome_tela`/`modulo`, ordenadas por gravações; inputs `Nome da Tela *`, `Atalho`, `Módulo *`, `Obs` + botão Salvar.
- Aba "Mapeadas" — lista completa com edição inline (`nome_tela`, `atalho`, `modulo`, `ativo`, `obs`) + Salvar por linha.
- Usa `sonner` para feedback e recarrega ao salvar.

## 3. Página `MonitorErpNativoPage.tsx`

**Cabeçalho / ações**

- Adicionar botão `De-Para de Telas` (ícone `Settings2`) ao lado do `Atualizar`, que abre o novo modal. Ao salvar, invalida as queries `monitor-erp-nativo` para refletir os nomes novos.

**Ranking de telas (aba "Telas")**

Nova estrutura de colunas:

| Tela (código) | Nome amigável | Atalho | Módulo | Tabela | Gravações | Usuários | Incl. | Alter. | Excl. | Última mov. | ✎ |

- Código em `font-mono text-xs`.
- Nome: `nome_tela` com fallback "— não mapeado —" em `italic text-muted-foreground`. Truncar com `truncateLabel` + `Tooltip` mostrando texto completo.
- Atalho: badge outline monoespaçada; oculto quando vazio.
- Módulo: badge sutil; "Não mapeado" quando vazio.
- Botão lápis por linha abre um `Popover` de edição rápida com os mesmos campos, faz `POST` e invalida queries. Mantém o clique na linha (fora do popover) abrindo o drawer de eventos.

**Telas sem uso (aba "Sem uso")**

Adicionar colunas `Nome`, `Atalho`, `Módulo` e o mesmo botão de edição inline.

**Eventos (tabela + drawer)**

Coluna `Tela` passa a exibir `nome_tela` em cima e `tela` em `font-mono text-[11px] text-muted-foreground` embaixo; tooltip completo. Adicionar coluna compacta `Módulo` quando presente.

**Filtros**

Placeholder do campo `Tela` passa a mencionar "código, nome ou atalho"; enquanto o backend não expandir, o filtro continua enviando `tela` como está.

## 4. Query invalidation

Após qualquer save do de-para (modal ou popover inline), chamar `queryClient.invalidateQueries({ queryKey: ['monitor-erp-nativo'] })` para refrescar ranking, eventos e sem-uso com os nomes atualizados.

## 5. Fora do escopo

- Nenhuma alteração em backend, edge function, migrations, RLS, contratos ou regras de auditoria.
- Nenhuma mudança na aba "ERP Nativo" da página antiga `MonitorTelasPage` (que usa `navegacaoTelemetriaApi` + `DeParaTelasModal`) — permanece como está.

## Arquivos

- **Editar** `src/lib/monitorErpNativoApi.ts` — novos campos opcionais.
- **Novo** `src/lib/monitorErpNativoDeparaApi.ts` — client dos endpoints de de-para.
- **Novo** `src/components/monitor-erp-nativo/DeParaMonitorErpModal.tsx` — modal (a mapear / mapeadas).
- **Novo** `src/components/monitor-erp-nativo/EdicaoTelaPopover.tsx` — popover de edição inline reutilizado nas tabelas.
- **Editar** `src/pages/MonitorErpNativoPage.tsx` — novas colunas, botão do modal, integração dos popovers, invalidations.
