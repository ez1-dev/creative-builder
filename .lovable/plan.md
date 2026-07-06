# Análise IA no rodapé dos módulos de RH

Adicionar um bloco "Análise da IA" ao final das páginas **Resumo Folha**, **Quadro Colaboradores**, **Contratos de Experiência**, **Férias** e **Turnover**, com 3 cards padronizados: **Diagnóstico**, **Riscos** e **Recomendações**.

## Comportamento
- Disparo **automático** ao abrir a página, após os dados carregarem.
- Enquanto gera: skeleton nos 3 cards + badge "Analisando...".
- Cache leve em memória por página+filtros (evita regerar ao alternar abas na mesma sessão).
- Botão discreto "Regenerar análise" no cabeçalho do bloco.
- Erros (429/402/etc) exibidos como card único com mensagem clara e botão tentar novamente.

## Layout (idêntico nas 5 páginas)
Componente novo `AiInsightsPanel` reutilizável:
- Título "Análise da IA" + subtítulo com data/hora da geração.
- Grid responsivo 3 colunas (mobile: 1 coluna) com cards:
  1. **Diagnóstico** (ícone Activity, cor primary) — leitura do cenário atual.
  2. **Riscos** (ícone AlertTriangle, cor warning/destructive) — pontos de atenção.
  3. **Recomendações** (ícone Lightbulb, cor success) — ações sugeridas.
- Cada card: 3–5 bullets curtos em markdown.
- Tokens semânticos do design system (sem cores hardcoded).

## Backend
- Nova edge function `rh-ai-insights` no Lovable Cloud.
- Recebe: `{ modulo: 'resumo-folha'|'quadro-colaboradores'|'contratos-experiencia'|'ferias'|'turnover', empresa, filtros, kpis, amostras }`.
- Chama Lovable AI Gateway com **google/gemini-3-flash-preview** via AI SDK (`@ai-sdk/openai-compatible`) + `generateText` com `Output.object` (schema `{ diagnostico: string[], riscos: string[], recomendacoes: string[] }`).
- Prompt do sistema personalizado por módulo (contexto de RH, foco em folha/headcount/contratos/férias/turnover).
- Trata 429 (rate limit) e 402 (créditos) devolvendo status apropriado.

## Escopo dos dados enviados
Para cada módulo, o frontend monta um payload compacto:
- **Resumo Folha**: totais por rubrica, custo total, variação mês anterior, top 5 rubricas.
- **Quadro Colaboradores**: headcount atual, série mensal, distribuição por setor/cargo, admissões/demissões do período.
- **Contratos de Experiência**: total ativos, próximos a vencer (30/60/90 dias), top 10 amostras.
- **Férias**: saldo vencido, a vencer, top 10 colaboradores em risco.
- **Turnover**: taxa do período, série mensal, motivos principais, setores com maior turnover.

## Integração nas páginas
Cada página RH ganha `<AiInsightsPanel modulo="..." payload={...} />` no final do JSX, alimentado pelos mesmos dados/hooks já existentes (sem refetch adicional). Nada é alterado na lógica de negócio existente.

## Detalhes técnicos
- Hook `useRhAiInsights(modulo, payload)` faz debounce (400ms) sobre o payload e chama `supabase.functions.invoke('rh-ai-insights', ...)`.
- Cache em `Map<string, Insights>` por hash(modulo+payload) durante a sessão.
- Sem persistência em banco nesta iteração.
- Sem alteração em `src/integrations/supabase/*`.

## Fora de escopo
- Chat/aprofundamento interativo.
- Persistência histórica das análises.
- Alteração de gráficos ou KPIs já existentes.
