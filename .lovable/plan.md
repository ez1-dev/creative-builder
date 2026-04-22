

## Diagnóstico: backend retorna 200 com `dados: []`

A tela está chamando o endpoint corretamente. Conferi 7 chamadas no network log: todas voltam `200 OK` com **`total_registros: 0` e `dados: []`** para o range `2026-03-23 → 2026-04-22`. Não é bug de frontend, autenticação nem permissão.

```
GET /api/auditoria-apontamento-genius?data_ini=2026-03-23&data_fim=2026-04-22…
→ 200 {"total_registros":0, "dados":[], "observacao":"…E900HOO + E900COP + E075PRO + E099USU + E906OPE."}
```

Há **dois problemas distintos** que precisam de ajuste:

### Problema 1 — Backend não está encontrando apontamentos (responsabilidade do ERP/FastAPI)
O backend foi publicado mas devolve zero. Causas prováveis (precisam ser investigadas no FastAPI, **não no Lovable**):
1. As tabelas usadas (`E900HOO/E900COP/E906OPE` — apontamentos do **chão de fábrica Senior**, não as `E660APO` documentadas) podem não conter linhas no período, ou o filtro fixo de **origens GENIUS** (`110, 120, 130, 135, 140, 150, 205, 208, 210, 220, 230, 235, 240, 245, 250`) está sendo aplicado em uma coluna que está vazia / com valores diferentes nessas tabelas.
2. Faltam apontamentos lançados no ERP nesse mês.

**Ação para validar (fora do Lovable):** rodar manualmente no banco do ERP:
```sql
SELECT TOP 50 * FROM E900HOO 
WHERE DATAPO BETWEEN '2026-03-23' AND '2026-04-22';
-- e
SELECT DISTINCT CODORI FROM E906OPE;  -- conferir se lista bate com GENIUS
```
Se vier vazio: alargar o range na tela (ex.: 2025-01-01 → hoje) para confirmar; se ainda vazio, o problema é o `WHERE` da query no FastAPI (provavelmente o `CODORI IN (...)` está mirando coluna errada).

### Problema 2 — Mismatch de chaves do `resumo` (responsabilidade desta tela)
O backend retorna nomes diferentes do que a tela consome. Mesmo quando vier dado, os KPIs de "Sem Início", "Sem Fim", "Fim < Início" e "Acima de 8h" vão mostrar **zero falso**.

**Mapeamento atual (backend → tela):**
| Backend | Tela espera |
|---|---|
| `total_sem_inicio` | `sem_inicio` |
| `total_sem_fim` | `sem_fim` |
| `total_fim_menor_inicio` | `fim_menor_inicio` |
| `total_apontamento_maior_8h` + `total_operador_maior_8h_dia` | `acima_8h` |
| (faltando) | `ops_em_andamento`, `ops_finalizadas`, `operador_maior_total` |

**Correção (única edição):** em `src/pages/AuditoriaApontamentoGeniusPage.tsx`, dentro de `atualizarKpisApontGenius`, normalizar o `resumo` aceitando ambos os nomes de chave (com e sem prefixo `total_`):

```ts
if (r) {
  const rAny = r as any;
  return {
    total_registros: rAny.total_registros ?? rows.length,
    total_discrepancias: rAny.total_discrepancias ?? 0,
    sem_inicio: rAny.sem_inicio ?? rAny.total_sem_inicio ?? 0,
    sem_fim: rAny.sem_fim ?? rAny.total_sem_fim ?? 0,
    fim_menor_inicio: rAny.fim_menor_inicio ?? rAny.total_fim_menor_inicio ?? 0,
    acima_8h: rAny.acima_8h
      ?? ((rAny.total_apontamento_maior_8h ?? 0) + (rAny.total_operador_maior_8h_dia ?? 0)),
    maior_total_dia_operador: rAny.maior_total_dia_operador ?? 0,
    operador_maior_total: rAny.operador_maior_total ?? '',
    ops_em_andamento: rAny.ops_em_andamento ?? opsSet.EM_ANDAMENTO.size,
    ops_finalizadas: rAny.ops_finalizadas ?? opsSet.FINALIZADO.size,
  };
}
```

Adicional: quando `data` vier mas `dados` vazio, mostrar um aviso amigável acima da tabela (banner cinza): *"O backend respondeu sem registros para este período. Verifique se há apontamentos GENIUS lançados no ERP no intervalo selecionado."* — ajuda o usuário a separar "tela quebrada" de "ERP sem dado".

### Atualização de documentação
- `docs/backend-auditoria-apontamento-genius.md`: adicionar nota informando que o backend foi implementado sobre `E900HOO/E900COP/E906OPE` (não `E660APO`) e formalizar **as duas variantes** de chave do `resumo` como aceitas (`sem_inicio` ou `total_sem_inicio`, etc.). Pedir ao time de backend que padronize na próxima iteração para os nomes sem prefixo + adicione `ops_em_andamento`, `ops_finalizadas`, `operador_maior_total`.

### Arquivos
- `src/pages/AuditoriaApontamentoGeniusPage.tsx` — normalização de chaves do `resumo` + banner "sem registros".
- `docs/backend-auditoria-apontamento-genius.md` — nota sobre variação de chaves e tabelas reais usadas.

### Fora de escopo
- Sem alteração no backend FastAPI (não está neste projeto). A investigação do **Problema 1** (zero registros) deve ser feita no servidor ERP rodando as queries SQL sugeridas acima.

