# Dashboard Geral — corrigir dados e melhorar visual

## Diagnóstico

Verifiquei o console e a rede da tela e vi por que várias abas aparecem vazias:

1. **Faturamento (`/api/faturamento-genius-dashboard`) → HTTP 500** — o backend rejeita `codemp` (SQL error "1 parameter marker but 3 supplied"). A `FaturamentoGeniusPage` que funciona envia apenas `anomes_ini` + `anomes_fim`.
2. **RH → nomes errados** — usei `admissoes`/`demissoes`, mas o endpoint devolve `admitidos`/`demitidos`. `turnover_pct` já vem em % (41.93), o hook divide por 100 duas vezes.
3. **Compras → alguns painéis vazios** — os campos reais são `por_fornecedor`/`por_tipo_despesa` (usei chaves alternativas que não existem, como `top_fornecedores`, `por_situacao`). "Atrasado" precisa vir de `valor_pendente_total` restrito a `ocs_atrasadas`.
4. **DRE, Balanço, Contas** — chamadas usam parâmetros/campos que o backend não expõe. Preciso alinhar `data_ini/data_fim` do DRE Configurável e o path real do Balanço (`/api/contabilidade/balanco` já existe via `getBalancoPatrimonial`, mas hoje envio `data_fim` em vez de `anomes_fim`). Contas a pagar/receber devolvem `resumo`/`total_valor` variando por página.
5. **Produção** — `/api/producao/dashboard` provavelmente não existe. Trocar para `cargaApi.centros`/`cargaApi.recursos` (já consumidos em `/producao/carga`) para métricas reais.
6. **Estoque** — `EstoqueMinMaxResponse` traz `resumo.abaixo_minimo`/`acima_maximo`/`ok`; item usa `saldo_atual`/`estoque_minimo`/`estoque_maximo`, sem custo unitário. Valor estocado precisa vir de outra fonte ou ser removido; usar `resumo` para os KPIs corretos.

## Correções por hook

**`useComercial`** — remover `codemp`; mapear também `por_mes.faturamento_total`, `por_revenda`, `por_produto`, `por_uf`. Aceitar shapes já presentes no payload (validar via console log com dados reais).

**`useCompras`** — trocar chaves de agregação: `top_fornecedores` → `por_fornecedor`, `situacao` → derivar de `itens_atrasados`/`itens_pendentes`, `valor_atrasado` = `valor_pendente_total` quando `ocs_atrasadas > 0` (ou omitir card se sem dado direto). Adicionar KPIs "Atrasadas (qtd)", "Ticket médio OC".

**`useFinanceiro`** — DRE Configurável exige `modelo_id`. Buscar o `MODELO_DRE_OFICIAL_ID` de `src/lib/contabilConfig.ts` e passar. Contas a pagar/receber: usar `/api/contas-pagar-arvore` e `/api/contas-receber-arvore` (mesmos endpoints das páginas) e extrair `resumo.valor_total`/`valor_vencido`.

**`useContabilidade`** — chamar `getBalancoPatrimonial({ anomes_ini, anomes_fim, codigo_empresa: 1, codigo_filial: 1 })` (assinatura correta). Somar `saldo_atual` por `grupo` (Ativo/Passivo/PL). DRE também com `MODELO_DRE_OFICIAL_ID`.

**`useRh`** — mapear `admitidos`→admissões, `demitidos`→demissões; `turnover_pct` já é %, remover multiplicação; adicionar KPI "Saldo" (`saldo`) e "Custo médio por colab" (`custo_total / headcount_medio`).

**`useProducao`** — substituir `/api/producao/dashboard` por `cargaApi.centros({})` + `cargaApi.recursos({})`. KPIs: OPs total (do `resumo`), horas por unidade, top 10 centros por horas, distribuição por unidade de negócio.

**`useEstoque`** — usar `resumo.abaixo_minimo`/`acima_maximo`/`ok`/`sem_politica`. Substituir "valor estocado" por "Sem política" ou "Sugestão mínima total" (`resumo.sugestao_minimo_total`). Ruptura por `estoque_minimo - saldo_atual`, exibir Top 10.

**`useManutencao`** — já funciona; adicionar KPI "Ticket médio" e agrupar por mês para mini-série.

## Melhorias visuais

- **Grid mais denso e uniforme**: KPIs em cards menores (h-24) com título xs, valor 2xl, ícone canto sup direito, cor semântica da borda esquerda mantida.
- **Substituir cards vazios por skeleton dedicado**: quando `status === 'erro'`, mostrar "Sem dados disponíveis" com link para a página do módulo em vez de R$ 0,00 sozinho.
- **Sparklines nos KPIs principais**: em Faturamento/Compras/Headcount adicionar mini-sparkline com últimos 12 meses (usar componente `KpiCard` estendido ou `LineChartCard` compacto).
- **Comparativos visuais**: badge de delta ao lado do valor (verde/vermelho) para todos os KPIs com valor mês anterior.
- **Visão geral enriquecida**: adicionar cards de "Contas a receber", "Contas a pagar", "PL", "Custo manutenção" e organizar em 3 seções nomeadas: *Comercial & Financeiro*, *Operações*, *Pessoas*.
- **Gráficos com títulos e legendas melhores**: eixos formatados em R$ / % / horas; cores diferenciadas por módulo (info/success/warning/danger) em vez de tudo azul.

## Arquivos

Editar:
- `src/hooks/dashboardGeral/useComercial.ts` (remover codemp, ampliar mapeamentos)
- `src/hooks/dashboardGeral/useCompras.ts` (chaves reais + novos KPIs)
- `src/hooks/dashboardGeral/useFinanceiro.ts` (modelo_id + endpoints -arvore)
- `src/hooks/dashboardGeral/useContabilidade.ts` (assinatura Balanço + modelo_id)
- `src/hooks/dashboardGeral/useRh.ts` (admitidos/demitidos + % correto)
- `src/hooks/dashboardGeral/useProducao.ts` (usar cargaApi)
- `src/hooks/dashboardGeral/useEstoque.ts` (usar resumo)
- `src/hooks/dashboardGeral/useManutencao.ts` (ticket médio + série)
- `src/pages/dashboard-geral/tabs/*` (aplicar melhorias visuais, novas seções em VisãoGeral, sparklines em KpiCard onde couber)

Criar:
- `src/pages/dashboard-geral/components/KpiCompact.tsx` — card KPI compacto reutilizável com sparkline opcional e badge de delta, todo em tokens semânticos (sem cores hardcoded).

## Fora do escopo

- Não vou pedir endpoints novos no FastAPI — se algum ainda falhar após as correções, a aba mostrará estado "Sem dados" com link para a página completa.
- Sem novo backend/edge functions.
- Sem alterar cálculos internos dos módulos originais.
