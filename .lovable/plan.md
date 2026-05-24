## Problema

A grid da aba **Centros de Recurso** mostra "Nenhum registro" mesmo com a API respondendo 200 OK com 30 linhas.

Verifiquei a resposta real de `GET /api/producao/carga/centros`:

```json
{
  "filtros": {...},
  "resumo": { "qtd_ops": 2670, "qtd_recursos": 29, ..., "linhas_sem_mapeamento_supabase": 5527 },
  "total_registros": 30,
  "dados": [
    { "unidade_negocio": "ESTRUTURAL", "tipo_recurso": "PRODUCAO", "codccu": "10715",
      "codcre": "3020", "descre": "E-GUILHOTINA - TEKLA",
      "codopr": "3020", "desopr": "CORTAR QUILHOTINA PROC. TEKLA",
      "qtd_ops": 33, "qtd_prevista": 172, "carga_prevista_min": 172, "carga_prevista_horas": 2.87 },
    ...
  ]
}
```

O frontend espera:
- `data.centros` → API agora envia `data.dados`
- `row.descricao_operacao` → API agora envia `row.desopr`

Resultado: `data?.centros ?? []` vira `[]` e a tabela fica vazia. Os demais campos (`codcre`, `descre`, `codccu`, `qtd_ops`, `qtd_prevista`, `carga_prevista_min`, `carga_prevista_horas`, `unidade_negocio`, `tipo_recurso`) já batem.

## Plano

Apenas alinhar tipos e renderização ao novo contrato, sem mudar lógica de negócio.

### 1. `src/lib/producao/cargaApi.ts`

- Em `CargaCentrosResponse`: renomear `centros: CargaCentroRow[]` para `dados: CargaCentroRow[]`. Adicionar `total_registros?: number` e `filtros?: any` (opcionais, refletem a resposta).
- Em `CargaCentroRow`: trocar `descricao_operacao: string` por `desopr: string`.
- (Opcional, fora de escopo se incomodar) — manter `CargaResumo.qtd_prevista?: number` que também vem no resumo.

### 2. `src/components/producao/carga/CentrosRecursoTab.tsx`

- `const list = data?.centros ?? []` → `data?.dados ?? []`.
- No filtro de busca trocar `r.descricao_operacao` por `r.desopr`.
- Na célula da tabela trocar `{r.descricao_operacao}` por `{r.desopr}`.

### 3. `src/components/producao/carga/VisaoGeralTab.tsx` (se referenciar `centros`)

- Vou verificar e, se usar `data.centros.length` para mostrar contagem, trocar por `data.dados?.length` ou `data.total_registros`.

## Fora de escopo

- Nenhuma alteração em `DetalheOpsTab`, `ParametrosRecursosTab`, hooks, ou Lovable Cloud.
- Não tocar no FastAPI nem renomear campos do lado do backend.
