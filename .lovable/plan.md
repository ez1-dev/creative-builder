
## Extensão da tela `Auditoria Apontamento Genius` — Status OP + Status Apontamento

### Diagnóstico
A tela já existe com KPIs/tabela/filtros para **Status do apontamento** (OK, SEM_INICIO, SEM_FIM, FIM_MENOR_INICIO, etc.). O pedido agora introduz uma **segunda dimensão de status independente**: o **Status da OP** (`EM_ANDAMENTO` / `FINALIZADO`), que é informação do cabeçalho da OP (E215OPE), não do apontamento. Também pede renomear status do apontamento para o novo vocabulário (`ABERTO`, `FECHADO`, `DIVERGENTE`, `ALERTA`).

Para preservar compatibilidade com os status já documentados (e evitar perder a granularidade que separa `SEM_INICIO`/`SEM_FIM`/`FIM_MENOR_INICIO`/`APONTAMENTO_MAIOR_8H`/`OPERADOR_MAIOR_8H_DIA` — útil nos KPIs), a tela passa a exibir **dois badges em colunas distintas**:
1. **Status OP** — badge enxuto (`EM_ANDAMENTO` azul / `FINALIZADO` cinza).
2. **Status Apontamento** — badge agregado pelo novo vocabulário (`ABERTO` / `FECHADO` / `DIVERGENTE` / `ALERTA`), derivado client-side a partir do `status` granular já retornado pelo backend.

### Arquivos a editar

**1. `src/lib/api.ts`** — estender `AuditoriaApontamentoGeniusResponse.resumo`:
```ts
ops_em_andamento: number;
ops_finalizadas: number;
```
E documentar (comentário) que `dados[i].status_op?: 'EM_ANDAMENTO' | 'FINALIZADO'` é opcional vindo do backend.

**2. `src/pages/AuditoriaApontamentoGeniusPage.tsx`** — alterações pontuais:

- **Filtro novo `status_op`** (`''` | `'EM_ANDAMENTO'` | `'FINALIZADO'`) via `<ComboboxFilter>` no `FilterPanel`. Enviado na query string.
- **Mapa de Status OP**:
  ```ts
  const statusOpVariants = {
    EM_ANDAMENTO: { label: 'Em andamento', className: 'bg-blue-600 text-white' },
    FINALIZADO:   { label: 'Finalizado',   className: 'bg-slate-500 text-white' },
  };
  ```
- **Derivação Status Apontamento (vocabulário novo)** via helper puro `derivarStatusApont(row)`:
  - `FIM_MENOR_INICIO` → `DIVERGENTE` (vermelho)
  - `APONTAMENTO_MAIOR_8H` ou `OPERADOR_MAIOR_8H_DIA` → `ALERTA` (vermelho forte)
  - `SEM_FIM` (tem início, falta fim) → `ABERTO` (amarelo)
  - `SEM_INICIO` → `ABERTO` com tint amarelo (mesmo bucket "em aberto / pendente")
  - `OK` → `FECHADO` (verde)
- **Coluna `status_op`** nova (após `total_dia_operador`, antes de `status`).
- **Coluna `status` renomeada** para `Status Apont.` exibindo o badge derivado, mantendo `title` com o status granular original (tooltip) para auditoria.
- **2 KPIs novos**: "OPs em andamento" (info, `Activity` icon) e "OPs finalizadas" (default, `CheckCircle2` icon). Grid passa de `lg:grid-cols-7` → `lg:grid-cols-9`. Fallback agrega contando `Set` de `numop` por `status_op` quando `resumo` não vier.
- **Filtro rápido local** passa a buscar também em `status_op` e no status apontamento derivado.
- **`rowClassName`** continua usando o status granular; sem mudança visual de tint.

**3. `docs/backend-auditoria-apontamento-genius.md`** — atualizar contrato:
- Adicionar query param `status_op` (`'EM_ANDAMENTO' | 'FINALIZADO'`, opcional).
- Adicionar campo `status_op` em cada item de `dados`, derivado de `E215OPE.SITPRO` (ou equivalente Senior): `1/2 → EM_ANDAMENTO`, `4/9 → FINALIZADO` (ajustar conforme dicionário). Documentar `JOIN` com `E215OPE` no SQL exemplo.
- Adicionar ao bloco `resumo`: `ops_em_andamento` e `ops_finalizadas` (contagem distinta de `numop` por status).
- Atualizar checklist: status_op presente em 100% das linhas; KPIs do resumo coerentes com `COUNT(DISTINCT numop)` por status_op.

### Fora de escopo
- Sem mudanças em `App.tsx`, `AppSidebar.tsx`, `profile_screens` (rota e permissão já existem).
- Sem refatorar `KPICard`, `DataTable`, `ComboboxFilter`, `FilterPanel`.
- Sem mocks; quando o backend ainda não publicar `status_op`, a coluna mostra `—` e os KPIs `OPs em andamento/finalizadas` ficam zerados — o resto da tela continua funcionando.

### Resultado esperado
Mesma tela `/auditoria-apontamento-genius`, agora com:
- Filtro **Status da OP** no painel.
- 9 KPIs no topo (inclui OPs em andamento / OPs finalizadas).
- Tabela com **duas colunas de status** lado a lado: `Status OP` (azul/cinza) e `Status Apont.` (verde/amarelo/vermelho), preservando o destaque visual de linhas com discrepâncias.
