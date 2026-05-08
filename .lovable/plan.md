## Central de Controle do ETL e BI Analítico — `/etl`

Evoluir a página `/etl` para ser a Central de Controle, com 8 abas: Tarefas, Conexões, Ações, Fila Integrador, Execuções, Logs (já existem) + reformulação completa de **Validação ERP × BI** + nova aba **Configuração BI**.

### 1. Migração — nova tabela `etl_configuracoes_bi`

```sql
CREATE TABLE public.etl_configuracoes_bi (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  descricao text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);
ALTER TABLE public.etl_configuracoes_bi ENABLE ROW LEVEL SECURITY;
-- Admins gerenciam; autenticados leem (backend usa service role)
CREATE POLICY "Admins manage etl_config_bi" ON public.etl_configuracoes_bi
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated read etl_config_bi" ON public.etl_configuracoes_bi
  FOR SELECT TO authenticated USING (true);
```

Seeds iniciais (todos com `valor='false'` ou padrão seguro):
- `USE_BI_ANALYTICS_COMPRAS` = `false`
- `USE_BI_ANALYTICS_RECEBIMENTOS` = `false`
- `USE_DASHBOARD_CACHE` = `false`
- `DASHBOARD_CACHE_TTL_MINUTES` = `5`
- `FALLBACK_TO_ERP_WHEN_BI_EMPTY` = `true`

### 2. Reformular aba **Validação ERP × BI** (`ValidacaoTab`)

Nova UI com seletor de **Módulo** (Compras / Recebimentos) + filtros completos:

```
[Módulo: Compras ▾] [Período ini] [Período fim]
[Projeto macro ▾] [Projeto] [Centro de custo] [Tipo despesa ▾] [Fornecedor]
[Somente pendentes] (compras) | [Transação NF ▾] (recebimentos)
[Validar]
```

- Combos `Projeto macro`, `Projeto`, `Centro de custo`, `Fornecedor` populados a partir das tabelas `bi_projetos`, `bi_centros_custo`, `bi_fornecedores`.
- Ao clicar **Validar**, chama:
  - `GET /api/bi/validar-painel-compras` (Compras)
  - `GET /api/bi/validar-notas-recebimento` (Recebimentos)
- Renderiza 3 colunas lado a lado: **ERP**, **BI**, **Diferença**, com 6 linhas (valor bruto, líquido, pendente, qtd documentos, itens, fornecedores). Para recebimentos: `valor_pendente`→`valor_total`, `qtd_ocs`→`qtd_nfs`.
- Indicadores: verde se diff = 0, amarelo se |diff%| < 2%, vermelho ≥ 2%.
- Mantém o painel "Status da camada analítica" (última execução de `ATU_COMPRAS`/`ATU_RECEBIMENTOS` + tabelas `bi_compras`/`bi_recebimentos` últimos meses). Adiciona **data da última carga ETL** por tabela (max `etl_updated_at`).
- Aviso amarelo se `bi_compras` ou `bi_recebimentos` estiver vazia, com link para a aba Ações.

### 3. Nova aba **Configuração BI** (`ConfiguracaoBiTab`)

Lê e grava `etl_configuracoes_bi`. Layout em cards:

**Cutover dos dashboards**
- Switch `USE_BI_ANALYTICS_COMPRAS`
- Switch `USE_BI_ANALYTICS_RECEBIMENTOS`
- Switch `FALLBACK_TO_ERP_WHEN_BI_EMPTY`

**Cache de dashboards**
- Switch `USE_DASHBOARD_CACHE`
- Input numérico `DASHBOARD_CACHE_TTL_MINUTES`

**Status**
- Para cada flag de cutover: mostra contagem de linhas e última carga da tabela correspondente; bloqueia ativação com aviso se a base estiver vazia.
- Mostra "Última execução" das tarefas `ATU_COMPRAS` / `ATU_RECEBIMENTOS`.

Cada `Switch`/`Input` faz `upsert` em `etl_configuracoes_bi` com `atualizado_por = auth.uid()`. Apenas admins editam (RLS); o backend FastAPI consulta a tabela via service role para decidir a fonte (em vez da env var `USE_BI_ANALYTICS`).

Toast informativo: "Configuração salva. O backend lê esse valor a cada requisição — efeito imediato após próximo refresh dos endpoints."

### 4. Reordenar tabs

```
Tarefas | Conexões | Ações | Fila Integrador | Execuções | Logs | Validação ERP × BI | Configuração BI
```

### 5. Atualizar `docs/backend-etl-bi.md`

Substituir a seção "Feature flag `USE_BI_ANALYTICS`" por:
- Backend lê flags da tabela `etl_configuracoes_bi` (cache em memória 30s).
- Mapeamento: `USE_BI_ANALYTICS_COMPRAS` → `/api/painel-compras*`; `USE_BI_ANALYTICS_RECEBIMENTOS` → `/api/notas-recebimento*`; `FALLBACK_TO_ERP_WHEN_BI_EMPTY` controla se cai pro ERP ou retorna 409 quando `bi_*` vazia; `USE_DASHBOARD_CACHE` + `DASHBOARD_CACHE_TTL_MINUTES` controlam `dashboard_cache`.
- Frontend NÃO troca dashboards — só a flag controla. Endpoints atuais permanecem.

### 6. Memória

Atualizar `mem://features/etl-bi.md` para registrar:
- Flags vivem em `etl_configuracoes_bi` (Cloud), não em env var.
- Página `/etl` é a Central de Controle com 8 abas.

### Detalhes técnicos

- Componentes existentes (`Switch`, `Tabs`, `Table`, `Input`, `Label`, `Card`, `Button`) cobrem tudo — sem novas libs.
- Acesso à `/etl` já é restrito a admins (RLS bloqueia escrita de qualquer forma).
- O frontend nunca chama o ERP direto: a comparação ERP × BI é feita pelo FastAPI nos endpoints `/api/bi/validar-*`.
- Sem mudança nos endpoints de dashboard atuais. O cutover é controlado 100% pela aba Configuração BI.
