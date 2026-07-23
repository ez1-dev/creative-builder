## Objetivo

Aplicar as três mudanças validadas do backend (23/07/2026) na tela **RH · Resumo da Folha**:

1. Remover o card "Vale Alimentação" (V.A.) — já é componente de Benefícios.
2. Adicionar card **INSS Patronal** (`kpis.inss_patronal`) ao lado do INSS (descontos).
3. Suportar os novos agrupamentos de drill (`colaborador` com nome, `evento_colaborador`, `colaborador_evento`, `analitico`) com colunas ricas e `limite=5000` nos níveis profundos.

Escopo restrito ao frontend — nenhuma mudança de contrato de API.

---

## 1. `src/pages/rh/ResumoFolhaPage.tsx`

### 1.1 Remover card V.A.
- Remover a linha do KPI `V.A.` (linha ~456).
- Ajustar tooltip do card **Benefícios** para `"Benefícios oficiais do período (inclui V.A.)"` reforçando o rótulo.
- Manter `va` em `FILIAL_COLS` (tabela por filial) — é breakdown, não card duplicado.

### 1.2 Reorganizar INSS lado a lado
- Renomear o card existente para **INSS (empregado)** — mais claro que "descontos".
- Adicionar novo card **INSS Patronal** logo depois, lendo `kpis.inss_patronal` com:
  - `field="inss_patronal"`, `missing={isMissing("inss_patronal")}`
  - tooltip: `"Encargo patronal do INSS (20% da base). Custo da empresa, não desconto do empregado."`
  - `variant="warning"` para distinguir visualmente do INSS empregado
  - `{...kpiDrill("inss_patronal")}` — quando `drills_menu` expuser esse card, o drill funciona automaticamente

Ordem final na grid de KPIs após Líquido/Salário Bruto/Outras Grat./Benefícios: `INSS (empregado)` → `INSS Patronal` → `FGTS` → ...

### 1.3 Tipos (`src/lib/rh/types.ts`)
Adicionar `inss_patronal?: number | null` no shape de `kpis` (linha ~274, ao lado de `inss_total`).

### 1.4 Parser (`src/lib/rh/api.ts`)
Adicionar `inss_patronal: ["inss_patronal"]` no mapa de aliases de KPIs (bloco ~227) para que o normalizador reconheça o campo.

---

## 2. Drills até o nível analítico

### 2.1 `src/components/rh/ResumoFolhaDrillDrawer.tsx`

**Rótulos amigáveis:** o drawer hoje só renderiza `a.label` do `drills_menu`. Adicionar um map local de fallback caso o backend devolva keys sem label bonito:
```ts
const AGRUPAMENTO_LABELS: Record<string, string> = {
  evento: "Por Evento",
  filial: "Por Filial",
  mes: "Por Mês",
  colaborador: "Por Colaborador",
  evento_colaborador: "Evento × Colaborador",
  colaborador_evento: "Colaborador × Evento",
  analitico: "Analítico (linha a linha)",
};
```
Aplicar em `TabsTrigger`: `{a.label || AGRUPAMENTO_LABELS[a.key] || a.key}`.

**Limite dinâmico:** níveis profundos precisam de `limite=5000`:
```ts
const DEEP_LEVELS = new Set(["evento_colaborador", "colaborador_evento", "analitico"]);
const limite = DEEP_LEVELS.has(tab) ? 5000 : undefined;
```
Passar `limite` para `fetchResumoFolhaDrill(...)` e incluir na `queryKey`.

**Tabela expandida:** hoje só mostra `Label / Valor / Qtd`. Nos níveis profundos, quando os itens trouxerem campos ricos (`colaborador`, `ds_evento`, `qtd_referencia`, `matricula`, `cd_evento`), renderizar colunas dedicadas:

| Nível | Colunas |
|---|---|
| raso (evento/filial/mês/colaborador) | Label · Valor · Qtd (mantido) |
| `evento_colaborador` / `colaborador_evento` | Colaborador (matrícula) · Evento · Valor · Qtd |
| `analitico` | Colaborador · Evento · Qtd. referência · Valor |

Detecção via `useMemo` sobre `data.itens` (checa presença de `colaborador`/`ds_evento`/`qtd_referencia`). Fallback para o layout raso se os campos não vierem.

**Aviso de truncamento:** quando `data.itens.length >= limite`, exibir badge amarelo `"Lista limitada a X linhas — o total acima já considera todos os registros"`.

**Rodapé:** adicionar contagem de linhas ao lado do "Fonte" — `N linhas · Total: R$ …`.

### 2.2 `src/lib/rh/api.ts` — `fetchResumoFolhaDrill`
Adicionar parâmetro opcional `limite?: number` na interface de request e propagar como query string `&limite=`. Não mexer nos consumidores existentes (default do backend permanece).

Adicionar ao tipo do item de drill (em `types.ts`) os campos opcionais retornados nos níveis profundos:
```ts
matricula?: string;
colaborador?: string;
cd_evento?: number;
ds_evento?: string;
qtd_referencia?: number;
cd_cargo?: number;
cd_centro_custo?: number;
cd_filial?: string;
anomes?: string;
```
Apenas como campos opcionais — nenhum consumidor atual é impactado.

---

## 3. Verificação

- Após restart da API, abrir `/rh/resumo-folha`:
  - card V.A. some, card INSS Patronal aparece com valor.
  - clicar em Proventos → aparecer abas "Por Evento", "Por Filial", "Por Mês", "Por Colaborador", "Evento × Colaborador", "Colaborador × Evento", "Analítico".
  - aba Analítico traz colunas Colaborador · Evento · Qtd. referência · Valor; total bate com o card.
- Rodar `tsgo` para garantir tipagem consistente.

---

## Detalhes técnicos

- Rótulos do card lidos de `drills_menu` continuam prevalecendo sobre o map de fallback.
- Nenhuma mudança em `useRh` do Dashboard Geral — este continua consumindo o mesmo endpoint.
- Nenhum consumidor de `kpis.va` é removido — apenas o card KPI. Colunas em `filiais` seguem intactas.
