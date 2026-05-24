## Plano

Trocar a fonte de dados da aba **Parâmetros de Recursos**: em vez de ler a tabela `producao_recurso_unidade` (vazia) no Lovable Cloud, listar os recursos distintos que aparecem na resposta de `/api/producao/carga/centros`, respeitando os filtros atuais da página.

### O que a aba vai mostrar

Uma linha por recurso (`codcre`), agregando as linhas vindas da API:

| Coluna | Origem |
|---|---|
| Unidade | `unidade_negocio` |
| Tipo | `tipo_recurso` |
| CCusto | `codccu` |
| Recurso | `codcre` |
| Descrição | `descre` |
| Qtd operações | nº de linhas (codopr) distintas no recurso |
| Qtd OPs | soma de `qtd_ops` |
| Carga (min) | soma de `carga_prevista_min` |
| Carga (h) | soma de `carga_prevista_horas` |

Busca por código/descrição e ordenação por horas (desc) por padrão, igual ao padrão da aba Centros.

### Arquivos

1. **`src/pages/producao/CargaProducaoPage.tsx`** — passar `filtros` para `<ParametrosRecursosTab filtros={filtros} />`.

2. **`src/components/producao/carga/ParametrosRecursosTab.tsx`** — reescrita:
   - Receber `filtros: CargaFiltros` como prop.
   - Usar `useCargaCentros(filtros)` (já existente).
   - Agregar `data.dados` por `codcre` em memo.
   - Renderizar nova tabela com as colunas acima + banner "Consulta — parametrização definitiva ainda será definida."

3. **`src/hooks/useCargaProducao.ts`** — remover `useParametrosRecursos` (sem mais consumidores).

4. **`src/lib/producao/parametrosRecursosCloud.ts`** — remover arquivo.

5. **`src/lib/producao/cargaApi.ts`** — remover types `ParametroRecurso` e `ParametroRecursoPayload` (não usados).

### Fora de escopo

- Tabela `producao_recurso_unidade` no Cloud permanece (não vai ser dropada nem populada).
- Nenhuma mudança no FastAPI, na aba Centros, Detalhe ou Visão Geral.
- A coluna "Origem do mapeamento" não entra aqui porque `/carga/centros` não envia esse campo por linha — ela já existe na aba Detalhe das OPs.
