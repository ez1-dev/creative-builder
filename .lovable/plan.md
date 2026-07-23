
# Tela "Indicadores Contábeis" — Analytics Gestão Contábil

Nova página em `/contabilidade/indicadores` que consome os endpoints determinísticos do backend e, sob demanda, a narrativa da IA. A tela apenas exibe/formata o que o backend devolve — nenhum cálculo no front.

## 1. Cliente da API

Novo módulo `src/lib/contabil/indicadoresApi.ts`:

- Tipos `Indicador`, `IndicadoresPayload`, `AnaliseIA` refletindo o shape do prompt (indicador, valor, unidade, formula, numerador, denominador, dias, tipo_saldo, status, avisos + `duplicidade_612_ativa` no topo + `analise` opcional).
- `fetchIndicadores(params)` → GET `/api/contabil/indicadores`.
- `fetchIndicadoresComAnalise(params)` → GET `/api/contabil/indicadores/analise?com_ia=true`.
- Usa o `ApiClient` existente (mesmo padrão de `contabilApi.ts`), com header ngrok e Bearer.

## 2. Hook

`src/hooks/contabil/useIndicadores.ts`:

- `useIndicadores({ anomes_ini, anomes_fim, codemp, codfil })` via TanStack Query — cache por chave completa dos filtros.
- `useIndicadoresAnalise(...)` desabilitado por padrão; disparado só quando o usuário clicar em "Gerar análise" (`enabled: false` + `refetch()`), para não custar IA em toda carga.

## 3. Página `src/pages/contabilidade/IndicadoresContabeisPage.tsx`

Estrutura:

```text
[PageHeader: Indicadores Contábeis]
[Filtros: Período (anomes_ini/fim) · Empresa (codemp) · Filial (codfil?)]
[Banner âmbar fixo se duplicidade_612_ativa]
[Grid de seções (7 cards agrupadores)]
[Rodapé técnico: Liquidez Corrente (conferência AC−PC = CDG)]
[Aba/painel lateral "Análise (IA)" — vazio até clicar em "Gerar análise"]
```

### Agrupamento (ordem já vem do backend)

Mapeamento fixo `SECOES` no arquivo da página, agrupando por nome do indicador:

| Seção | Indicadores |
|---|---|
| Resultado (R$) | Receita Bruta, Receita Líquida, Custo, Resultado Bruto, Lucro Líquido |
| EBITDA | EBITDA Operacional Senior, EBITDA sem resultado financeiro, EBITDA oficial (c/ dup), Margens EBITDA (2) |
| Rentabilidade (%) | Margem Bruta, ROE, ROA |
| Prazos (dias) | PME documental/gerencial, PMP documental/gerencial/clássico simulado |
| Liquidez (índice) | Corrente, Seca, Imediata |
| Endividamento (%) | Geral, Financeiro, Composição |
| Capital de giro (R$) | CDG (conferência AC−PC vai pro rodapé) |

Regra: as duas variantes de EBITDA e as variantes de PME/PMP são exibidas **lado a lado** — nunca uma esconde a outra.

### Componentes internos (mesmo arquivo ou `src/components/contabil/indicadores/`)

- `IndicadorCard` — mostra nome, valor formatado (por `unidade`), badge de `status` (oficial=neutro, gerencial=cinza, simulado=âmbar), botão "detalhes" que abre `IndicadorDetalheDrawer`.
- `IndicadorDetalheDrawer` — usa `Sheet` do shadcn com: fórmula, numerador, denominador, dias, tipo_saldo, status, avisos.
- `AnaliseIAPainel` — renderiza `analise.narrativa` como markdown (usar `react-markdown` já presente se disponível; caso contrário adicionar); botão "Gerar análise"; estados: idle / loading / erro (mostrar `analise.erro`) / ok.
- `DuplicidadeBanner` — Alert âmbar com o texto do prompt.

### Formatação (usa helpers de `src/lib/format.ts` / `bi/utils/formatters.ts`)

- `R$` → `formatCurrency` (negativos em vermelho).
- `%` → 1–2 casas + "%".
- `dias` → `n dias`.
- `índice` → 2 casas decimais.
- `valor === null` ou `denominador === 0` → renderiza "—".

### Badges

- `oficial` → `Badge variant="secondary"` (azul).
- `gerencial` → `Badge` cinza.
- `simulado` → `Badge` âmbar + tooltip com lista de `avisos`.

## 4. Roteamento e menu

- Registrar rota em `src/App.tsx`: `/contabilidade/indicadores` → `IndicadoresContabeisPage` (lazy).
- Adicionar item em `src/config/menuCatalog.ts` na seção Contabilidade: `{ title: 'Indicadores Contábeis', url: '/contabilidade/indicadores', icon: BarChart3 }`.
- Adicionar entrada em `ALL_SCREENS` de `src/pages/ConfiguracoesPage.tsx` para liberação via Central de Liberações.

## 5. Estado e persistência

- Filtros mantidos em URL search params (padrão já usado em outras telas contábeis: `useSearchParams`).
- Defaults: ano corrente completo (`AAAA01` até `AAAA12`), `codemp=1`, `codfil` vazio.

## 6. Erros

- Erros HTTP → toast (sonner) + estado de erro no card.
- Sem `analise.narrativa` → painel mostra "Análise indisponível" (não bloqueia números).
- Se endpoint retornar 404/504 (API 8070 ainda não reiniciada) → banner "Indicadores indisponíveis: aguardando restart da API".

## Detalhes técnicos

- Não recalcular nada no front — todos os números vêm prontos.
- Sem dependência nova; se `react-markdown` não existir no projeto, adicionar (uso apenas nesta tela).
- Todos os tokens de cor via design system (âmbar = `hsl(var(--warning))`, vermelho = `text-destructive`).
- Sem alterações em `src/integrations/supabase/*`, `.env`, backend, ou outras telas de Contabilidade.

## Fora do escopo

- Cálculos, edição de fórmulas, escolha da variante "oficial" de EBITDA (é decisão da contabilidade, não do app).
- Ajustes no ERP para a duplicidade 612.
- Endpoint `/aglutinadores` (não pedido na tela).
