

## Filtro de intervalo por semana na Auditoria Apontamento Genius

### Diagnóstico
Hoje a tela `/auditoria-apontamento-genius` tem filtros de período baseados em `data_ini`/`data_fim` (datas avulsas) e provavelmente um atalho "Últimos 12 meses". O usuário quer um **atalho/seletor por semana** (ex.: "Esta semana", "Semana passada", e/ou navegação semana a semana) que preencha automaticamente `data_ini` (segunda) e `data_fim` (domingo) da semana escolhida.

### Perguntas antes de implementar
Preciso confirmar 2 coisas para acertar a UX:

1. **Formato preferido do seletor de semana:**
   - (a) Botões de atalho: `Esta semana` | `Semana passada` | `Últimas 4 semanas` (junto com os atalhos de mês existentes).
   - (b) Navegador semanal: campo "Semana 17/2026 (20–26 abr)" com setas ◀ ▶ para avançar/voltar 1 semana.
   - (c) Os dois combinados.

2. **Início da semana:**
   - Segunda a domingo (padrão BR/ISO).
   - Domingo a sábado.

### Mudança planejada (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Helpers de semana (locais ao arquivo)**
- `inicioSemana(date, startsOn)` → segunda (ou domingo) da semana da data.
- `fimSemana(date, startsOn)` → domingo (ou sábado) da semana da data.
- `numeroSemanaISO(date)` → "S17/2026" para exibição.
- `addSemanas(date, n)` → desloca n semanas.

**2. Atalhos no `FilterPanel`**
Adicionar ao lado dos atalhos de período existentes (após "Últimos 12 meses"):
- `Esta semana` → `data_ini = inicioSemana(hoje)`, `data_fim = fimSemana(hoje)`.
- `Semana passada` → semana de `hoje - 7 dias`.
- `Últimas 4 semanas` → `data_ini = inicioSemana(hoje - 21d)`, `data_fim = fimSemana(hoje)`.

Cada atalho dispara `setFilters({...})` + `buscar()` automaticamente (mesmo padrão dos atalhos de mês existentes, se houver).

**3. (Opcional, se opção b/c) Navegador semanal**
Linha extra no `FilterPanel` com:
- `Button ◀` (semana anterior)
- Label central: `Semana 17/2026 · 20/04 – 26/04`
- `Button ▶` (próxima semana, desabilitado se semana > hoje)
- `Button "Hoje"` (volta para semana atual)

Cada clique ajusta `data_ini` / `data_fim` e dispara busca.

**4. Sem mudança no backend**
- Continua usando os mesmos parâmetros `data_ini` / `data_fim` no endpoint.
- Apenas o frontend monta as datas corretas para uma semana.

### Detalhes técnicos
- Usar `date-fns` (já presente no projeto) com `startOfWeek`, `endOfWeek`, `addWeeks`, `getISOWeek`, `getISOWeekYear`, `format`.
- `weekStartsOn: 1` (segunda) por padrão, ajustável conforme resposta.
- Sem novas dependências.

### Fora de escopo
- Salvar preferência do usuário entre sessões.
- Filtro por mês específico ou por trimestre.
- Mudar a paginação ou KPIs.

### Resultado
Usuário consegue, em 1 clique, recortar a auditoria por semana (atual, anterior ou últimas 4) — ou navegar semana a semana com setas, dependendo da escolha. Os campos `data_ini`/`data_fim` continuam visíveis e editáveis manualmente.

