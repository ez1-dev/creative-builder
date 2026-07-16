## Objetivo

Elevar a qualidade da escrita dos relatórios gerados por IA em todos os pontos do sistema. A alteração é **exclusivamente nos SYSTEM prompts** das edge functions — nenhum schema, endpoint, contrato de UI, layout de PDF ou lógica de negócio é tocado. As telas e PDFs passam a exibir textos mais robustos automaticamente, sem qualquer mudança de frontend.

## Padrão editorial único (aplicado a todas as funções)

Cada prompt de sistema passa a exigir o mesmo padrão de escrita:

1. **Abertura factual quantificada** — todo bullet começa com o número que importa (valor absoluto + Δ absoluto + Δ %), no formato `R$ 1,61 mi (+R$ 177 mil, +12,4% vs período anterior)`. Sem adjetivos vazios ("bom", "ruim", "significativo") desacompanhados de número.
2. **Materialidade primeiro** — priorizar as 3–5 variações de maior impacto financeiro/operacional, não listar tudo. Cada bullet informa por que a variação é relevante (peso sobre o total, concentração, quebra de tendência).
3. **Causa provável** — quando o payload permitir cruzamento (filial, evento, cargo, cliente, produto, tela), citar o driver: "puxado por Filial X (68% do delta)" ou "concentrado em 3 eventos: HE 100%, HE 60%, adicional noturno".
4. **Recomendação acionável** — verbo no infinitivo + responsável sugerido + prazo + KPI alvo. Ex.: "Revisar escala de HE na Filial X até dd/mm, meta de reduzir 15% até próximo fechamento".
5. **Sinalização de risco** — classificar cada risco como financeiro / trabalhista / operacional / reputacional, com estimativa de exposição quando o payload permitir.
6. **Higiene numérica** — nunca inventar números fora do payload; quando um campo estiver ausente, escrever explicitamente "não informado no período" em vez de omitir. Percentuais sempre com 1 casa; valores monetários em pt-BR (R$, milhar com ponto, decimal com vírgula, abreviar `mi`/`mil` acima de 6 dígitos).
7. **Tom executivo** — frases curtas, voz ativa, PT-BR, sem jargão de consultoria ("sinergias", "alavancar"), sem repetir o que já está na tela como número solto.
8. **Limites de tamanho** — mantidos os limites atuais por bullet (260 chars) e por seção (3–6 bullets), para não quebrar layouts existentes.

## Arquivos alterados

Todos são edge functions em `supabase/functions/*/index.ts`. Somente a constante de SYSTEM prompt (ou equivalente) é reescrita — o restante do arquivo (schema da tool, chamada ao gateway, normalização, CORS) permanece idêntico.

| Função | O que muda no prompt |
|---|---|
| `rh-relatorio-ia` | SYSTEM ganha o padrão editorial acima + regra de citar sempre custo total, líquido, HE, benefícios, INSS/FGTS com Δ e peso relativo; alertas passam a exigir exposição estimada em R$ quando aplicável. |
| `rh-ai-insights` | `SYSTEM_BASE` reforçado com padrão editorial; blocos `FOCO[modulo]` reescritos para pedir causas específicas por módulo (quadro → drivers de admissão/desligamento por filial e cargo; férias → risco jurídico por dias vencidos; turnover → coorte e tempo de casa; absenteísmo → concentração por setor/dia da semana). |
| `dashboard-geral-insights` | SYSTEM inline reforçado para produzir 3 blocos: leitura consolidada (com números), riscos priorizados por impacto financeiro, próximas ações com responsável sugerido. |
| `relatorio-executivo-ia` | `cfg.persona` mantida; SYSTEM ganha o padrão editorial + exigência de comparar sempre vs. mês anterior, YTD e meta (quando presentes no payload) e destacar top 3 clientes/produtos que explicam o desvio. |
| `monitor-telas-ia` | `SYSTEM_BASE` + `FOCO[origem]` reforçados para citar telas específicas com nº de execuções, usuários únicos, variação % vs semana anterior, e sinalizar telas críticas com queda >20%. |
| `sugestao-minmax-ia` | `SYSTEM_PROMPT` reforçado para justificar cada sugestão de mín/máx/PP/lote com: consumo médio + desvio, lead time, cobertura em dias resultante e impacto em capital de giro. Mantém o schema atual. |

## Fora do escopo

- Não altera schema de tools, contrato de resposta, tipos TS, componentes React, PDF layout, catálogos de widgets, permissões, rotas ou tabelas.
- Não troca modelo de IA nem parâmetros do gateway.
- Não mexe em `ai-assistant`, `bi-ia-chart` nem `biblioteca-bi-suggest` (não são relatórios executivos — são chat/assistente e sugestor de gráfico).

## Validação

Após aplicar, gerar um relatório em `/rh/relatorio-gerencial`, abrir o `/dashboard-geral` e o `/bi/faturamento/relatorio-executivo` e conferir que os bullets seguem o novo padrão (número na abertura, driver, ação com prazo).
