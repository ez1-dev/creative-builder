

## Fallback local para KPIs de discrepância

### Problema
Quando o backend retorna `resumo` mas sem os campos de discrepância (`total_discrepancias`, `sem_inicio`, `sem_fim`, `fim_menor_inicio`, `acima_8h`, `maior_total_dia_operador`), os KPIs aparecem como 0. Hoje a agregação local só roda quando `resumo` é totalmente ausente.

### Mudanças

**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. **Refatorar `atualizarKpisApontGenius` (linhas 357-424)**
   - Sempre executar o loop de agregação local sobre `data.dados` (página atual) — extrair os contadores de discrepância para variáveis (`localDiscrepancias`, `localSemInicio`, `localSemFim`, `localFimMenorInicio`, `localAcima8h`, `localMaiorDia`, `localOperadorMaior`).
   - Para cada KPI de discrepância no retorno, usar `r?.campo ?? localXxx` (em vez de `?? 0`). Contagens "estruturais" (`total_registros`, `ops_em_andamento`, `ops_finalizadas`) seguem priorizando o resumo.
   - Acrescentar flag `discrepanciasParciais: boolean` no objeto retornado: `true` quando o backend não enviou nenhum campo de discrepância no `resumo` E o fallback local foi aplicado E a resposta é paginada (i.e., `rows.length < total_registros`).

2. **Aviso visual**
   - Logo acima do grid de KPIs (antes do `<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9">` na linha 565), renderizar um `Alert` (variante default, ícone `Info` do `lucide-react`) condicional a `atualizarKpisApontGenius.discrepanciasParciais`:
     > **KPIs de discrepância calculados sobre a página atual.** O backend não enviou totais consolidados; valores de "Discrepâncias", "Sem Início", "Sem Fim", "Fim < Início", "Acima de 8h" e "Maior Total Dia" refletem apenas as N linhas exibidas.
   - Usar componentes existentes: `Alert`, `AlertDescription` de `@/components/ui/alert`.

3. **Sem outras mudanças** — KPIs estruturais, layout, cores e ordenação permanecem.

### Comportamento resultante

| Cenário | KPIs discrepância | Aviso |
|---|---|---|
| Backend manda `total_discrepancias` etc | Valores do backend | Não aparece |
| Backend manda `resumo` sem campos de discrepância | Agregado da página atual | **Aparece** |
| Backend não manda `resumo` | Agregado da página atual | **Aparece** |

### Fora de escopo
- Buscar todas as páginas para agregar globalmente.
- Mudar backend.
- Persistência ou novos filtros.

### Resultado
KPIs de discrepância deixam de ficar zerados quando o resumo do backend é incompleto, com aviso claro de que o cálculo é parcial.

