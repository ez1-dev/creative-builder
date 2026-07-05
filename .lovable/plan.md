## Situação atual

A página `/rh/programacao-ferias` **já foi criada** na conversa anterior e já contempla praticamente tudo do brief:

- Rota `/rh/programacao-ferias` registrada em `src/App.tsx`.
- `fetchProgramacaoFeriasDashboard(codemp)` em `src/lib/rh/api.ts` consumindo `GET /api/rh/programacao-ferias/dashboard?codemp=1` com Bearer token (mesmo padrão das outras telas RH, sem tocar em Supabase, sem cálculo no front).
- 6 KPI cards lendo direto de `kpis` (Férias Vencidas / A Vencer 30/60/90 / Férias Total / De Férias) com as cores pedidas (vermelho, âmbar, lima, verde escuro, azul, azul-marinho).
- Tabela **Limite Férias** (pivot ano × m1..m12 + total), ordenada por ano asc, mostrando "-" quando 0/null.
- Tabela **Programação Próximos 90 Dias** com as 9 colunas pedidas e "Sem dados" quando vazio.
- Tabela **1º Vencimento e Sem Programação** ordenada por `dt_limite_saida` asc, com scroll vertical.
- Header via `RhPageHeader`, que já injeta o botão **Sincronizar RH** padrão.

## O que ainda precisa ser criado/ajustado

Apenas 2 pequenos ajustes — nenhum arquivo novo:

### 1) Bug de fuso nas datas (obrigatório do brief)

Hoje as células de data usam `formatDate` de `src/lib/format.ts`, que faz `new Date("YYYY-MM-DD").toLocaleDateString('pt-BR')` — isso interpreta como UTC e recua 1 dia no Brasil, exatamente o problema descrito.

Correção **local à página** (não mexer no helper global para não impactar outras telas):

- Em `src/pages/rh/ProgramacaoFeriasPage.tsx`, adicionar helper:
  ```ts
  const formatDateBR = (s?: string | null) => {
    if (!s) return "-";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };
  ```
- Substituir todas as chamadas `formatDate(...)` das 2 tabelas (Próximos 90 Dias e 1º Vencimento) por `formatDateBR(...)`.
- Remover o import de `formatDate` de `@/lib/format`.

### 2) Botão "Atualizar" no header

O brief pede um botão explícito para recarregar o endpoint. Hoje só há o "Sincronizar RH".

- Passar `actions={<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw /> Atualizar</Button>}` para `<RhPageHeader />`.
- Expor `refetch` e `isFetching` do `useQuery`.

## Fora de escopo

- Não recalcular `ferias_total` / `ferias_vencidas` no front — continua vindo pronto do backend (fórmula do UpQuery é responsabilidade do FastAPI).
- Não alterar `formatDate` global.
- Não mexer em Supabase.

## Detalhes técnicos

Arquivos tocados: **apenas** `src/pages/rh/ProgramacaoFeriasPage.tsx`.
Sem migrations, sem novos endpoints, sem novos componentes.