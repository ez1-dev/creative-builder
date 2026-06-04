## Objetivo

Eliminar os warnings do DevTools:
- *"A form field element should have an id or name attribute"*
- *"No label associated with a form field"*

Padrão obrigatório (já adotado nos diálogos do BI Comercial):

```tsx
const uid = useId();
<Label htmlFor={uid}>Tipo</Label>
<Input id={uid} name="tipo" aria-label="Tipo" ... />
```

Para `Select`: `<SelectTrigger id={uid} name="x" aria-label="x">`.
Para campos sem label visual (busca, cor, etc.): `aria-label` obrigatório.
Placeholder **nunca** substitui label.

## Escopo

Varredura mostrou **~540 campos** em **93 arquivos** usando `<Input>`, `<SelectTrigger>`, `<Textarea>`, `<Checkbox>`, `<RadioGroup>`. A `LoginPage` não tem inputs (login é só botão Microsoft) — nenhum trabalho ali.

Por volume, vou atacar em **ondas**, do mais reutilizado para o mais isolado. Cada onda é um commit independente e verificável.

## Onda 0 — Reforçar componentes base (1 arquivo, alto impacto)

`src/components/ui/input.tsx`, `select.tsx`, `textarea.tsx`, `checkbox.tsx`, `radio-group.tsx`:
- Garantir que `id` e `name` são repassados (shadcn já faz, mas confirmar).
- Em modo dev, adicionar `console.warn` opcional quando renderizar sem `id` E sem `aria-label` — ajuda a localizar regressões futuras.

Componentes utilitários compartilhados que renderizam inputs internamente, e que aparecem em dezenas de páginas:

- `src/components/bi/filters/DateRangeFilter.tsx` — adicionar `useId`, `htmlFor`, `id`, `name`, `aria-label` nos dois `Input type="date"`.
- `src/components/bi/filters/SelectFilter.tsx` — `useId`, `htmlFor`, `SelectTrigger id/name/aria-label`.
- `src/components/erp/FilterSection.tsx` / `FilterPanel.tsx` — sem inputs próprios, ok.
- `src/components/passagens/ColaboradorCombobox.tsx` — `aria-label` no trigger.
- `src/components/relatorios/ColumnsEditor.tsx`, `ParametersEditor.tsx`, `SqlEditor.tsx` — campos editáveis em listas: usar `useId` + sufixo por linha.

Ajustar esses 5–8 wrappers já cobre uma parte enorme dos campos por transitividade.

## Onda 1 — Páginas ERP de alto tráfego (filtros e buscas)

Por contagem de campos:
1. `pages/PainelComprasPage.tsx` (21)
2. `pages/ContasPagarPage.tsx` (21)
3. `pages/NotasRecebimentoPage.tsx` (20)
4. `pages/ContasReceberPage.tsx` (19)
5. `pages/PassagensAereasPage.tsx` (15)
6. `pages/DemonstrativoComprasRecebimentosPage.tsx` (15)
7. `pages/ManutencaoFrotaPage.tsx` (13)
8. `pages/ConciliacaoEdocsPage.tsx` (13)
9. `pages/ManutencaoMaquinasPage.tsx` (12)
10. `pages/AuditoriaTributariaPage.tsx` (11)
11. `pages/NumeroSeriePage.tsx` (10)
12. `pages/FaturamentoGeniusPage.tsx` (10)

Padrão de edição por arquivo:
- Adicionar `useId` (um por campo, ou prefixo + sufixo manual quando dinâmico).
- Em todo `<Label>` solto, incluir `htmlFor`.
- Em todo `<Input>`/`<SelectTrigger>`/`<Textarea>`, incluir `id`, `name` (snake_case coerente com o filtro), e `aria-label` quando o label não for textualmente óbvio.
- Em campos sem `<Label>` visível (busca com ícone), apenas `aria-label`.

## Onda 2 — Componentes de produção, regras Senior, relatórios, frota/máquinas/passagens

Lista (≥6 campos cada):
- `components/producao/programacao/{CapacidadesTab, EntregasProgramadasTab, LeadTimesTab, PrioridadeOpTab, ProgramacaoFiltersBar}.tsx`
- `components/producao/carga/CargaFiltersBar.tsx`
- `components/regras-senior/{ImportarFonteLspDialog, RegraForm, AuditoriaList, IdentificadoresList}.tsx`
- `components/relatorios/tabs/DadosGeraisTab.tsx`
- `components/passagens/PassagensDashboard.tsx`
- `components/faturamento/AuditoriaRevendaTab.tsx`
- `pages/producao/{ExpedidoObraPage, ProduzidoPeriodoPage, SaldoPatioPage, ProducaoDashboardPage, NaoCarregadosPage, LeadTimeProducaoPage, ImpressaoOrdemProducaoPage}.tsx`
- `pages/{EstoqueMinMaxPage, ConfiguracoesPage, ComprasProdutoPage, SugestaoMinMaxPage, MonitorUsuariosSeniorPage, contabilidade/BalancoPatrimonialPage}.tsx`

## Onda 3 — Restante da cauda (~45 arquivos com ≤5 campos)

Varredura final por `rg` para localizar qualquer `<Input ` ou `<SelectTrigger` sem `id=` adjacente e fechar pendências, incluindo dialogs menores e telas de teste/admin.

## Validação ao final de cada onda

1. Abrir 3–4 páginas representativas no preview.
2. Confirmar console limpo (sem warnings `id or name` / `No label associated`).
3. Rodar `tsc` (automático no harness).
4. Spot-check de autofill: campos como CPF/CNPJ/datas devem aceitar sugestão do navegador.

## Detalhes técnicos

- **`useId` por linha em listas dinâmicas**: já há padrão estabelecido em `SeriesEditor.tsx` (`${uid}-row-${i}-metric`). Reusar.
- **Convenção de `name`**: snake_case alinhado com o filtro/coluna (`data_inicio`, `cd_fornecedor`, `situacao_oc`).
- **Selects shadcn**: `id`/`name`/`aria-label` vão no `SelectTrigger`, nunca no `Select` raiz.
- **Inputs de busca com ícone**: usar `aria-label="Buscar <entidade>"`.
- **Date pickers customizados (Popover + Calendar)**: o `Button` que abre o popover recebe `aria-label`; o `Calendar` interno do Radix já é acessível.
- **Sem alteração de comportamento**: nenhuma mudança de lógica, apenas atributos de acessibilidade.

## Entrega proposta

Confirmo Onda 0 + Onda 1 nesta primeira execução (≈14 arquivos, ~180 campos), com console verificado no preview ao final. Ondas 2 e 3 entram em iterações seguintes para manter cada commit auditável.
