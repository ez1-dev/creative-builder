## Objetivo
Adicionar um grid "Empresa" com uma linha por empresa e colunas por KPI (Colaboradores, Trabalhando, Admitidos, Demitidos, PCD, Estagiários, Jovem Aprendiz, Férias, Aposent. Invalidez, Auxílio Doença, Acidente Trabalho, Atestados) + linha de totais, consumindo o payload atual do `/api/rh/quadro-colaboradores/dashboard`.

## Escopo

- `src/lib/rh/quadroDashboardApi.ts`: extrair matriz por empresa do payload.
- `src/pages/rh/QuadroColaboradoresPage.tsx`: novo grid substituindo/complementando o card `BarChartCard` "Empresa" atual.

Nada de backend, nada de cálculo de headcount no front.

## Mudanças

### 1. Novo tipo e mapper em `quadroDashboardApi.ts`

Tipos:
```ts
export interface QuadroEmpresaLinha {
  empresa: string;
  colaboradores?: number | null;
  trabalhando?: number | null;
  admitidos?: number | null;
  demitidos?: number | null;
  pcd?: number | null;
  estagiarios?: number | null;
  jovem_aprendiz?: number | null;
  ferias?: number | null;
  aposentadoria_invalidez?: number | null;
  auxilio_doenca?: number | null;
  acidente_trabalho?: number | null;
  atestados?: number | null;
}
```

Adicionar `empresa_detalhado?: QuadroEmpresaLinha[]` ao `QuadroDashboard`.

Novo mapper `pickEmpresaMatriz(raw)`:
- Fontes procuradas: `empresa_detalhado`, `empresas_detalhado`, `por_empresa_detalhado`, `empresa_kpis`, `empresas`, `por_empresa` (quando itens forem objetos com múltiplos campos, não só `{empresa, quantidade}`), `distribuicoes.empresa_detalhado`, `distribuicoes.empresas`, `resumo.empresa`.
- Aceita array `[{empresa, colaboradores, trabalhando, admitidos, demitidos, pcd, estagiarios, jovem_aprendiz, ferias, aposentadoria_invalidez, auxilio_doenca, acidente_trabalho, atestados}]`.
- Também aceita aliases por campo (mapa `KPI_ALIASES`):
  - colaboradores: `total`, `qtd`, `quantidade`, `headcount`, `qtd_colaboradores`.
  - trabalhando: `ativos`, `qtd_trabalhando`, `em_trabalho`.
  - admitidos: `admissoes`, `admitidos_mes`.
  - demitidos: `demissoes`, `demitidos_mes`.
  - pcd: `qtd_pcd`.
  - estagiarios: `estagiario`, `qtd_estagiarios`.
  - jovem_aprendiz: `aprendiz`, `jovens_aprendizes`.
  - ferias: `em_ferias`.
  - aposentadoria_invalidez: `aposentadoria`, `aposentados`, `invalidez`, `aposent_invalidez`.
  - auxilio_doenca: `aux_doenca`, `auxilio`.
  - acidente_trabalho: `acidente`, `acidentes`.
  - atestados: `atestado`.
- Se o campo não aparecer no objeto, deixa `undefined` (renderiza "—").
- Se aparecer com `null`, mantém `null` (renderiza "—").
- Sem soma/derivação no front.

Manter `empresa` (breakdown simples) para retrocompatibilidade — deriva a partir de `empresa_detalhado` quando essa lista existir e o `empresa` simples não vier.

### 2. `QuadroColaboradoresPage.tsx`

Substituir o bloco atual do `BarChartCard` "Empresa" por um novo componente `EmpresaGrid` renderizando uma `<Table>`:

- Header: Empresa | Colaboradores | Trabalhando | Admitidos | Demitidos | PCD | Estagiários | Jovem Aprendiz | Férias | Aposent. Invalidez | Auxílio Doença | Acidente Trabalho | Atestados.
- Linhas: uma por empresa (`empresa_detalhado`), ordenadas por `colaboradores` desc.
- Números formatados `pt-BR`, `tabular-nums`, valores nulos/undefined = `—`.
- Linha de totais (sticky no bottom, `font-medium`) somando apenas colunas cujas células são numéricas — a soma é agregação visual da própria linha (não é regra de negócio).
- Manter observação discreta abaixo do grid: "Montagem Externa pendente de regra na API." se nenhuma linha contiver `MONTAGEM EXTERNA` na label.
- Fallback:
  - Sem `empresa_detalhado` mas com `empresa` simples → renderizar grid só com coluna "Colaboradores".
  - Sem nada → manter card atual "Classificação Empresa pendente de regra na API".

Sem alterar demais KPIs, gráficos ou histórico.

## Detalhes técnicos

- Reaproveitar componentes `Table`, `TableHeader`, `TableRow`, `TableCell` já usados em `FilialTable`.
- Container com `overflow-x-auto` para caber colunas em desktop.
- Sem novas dependências.
- Sem edição em `src/integrations/supabase/*`.

## Fora de escopo

- Backend / FastAPI / novos endpoints.
- Recalcular headcount, admissões, demissões.
- Alterar KPIs, gráficos, histórico ou layout de outras seções da página.

## Validação (data_ref = 2026-04-30)

- Linhas GENIUS, ESTRUTURAL e (quando API entregar) MONTAGEM EXTERNA, cada uma com as colunas preenchidas conforme payload.
- Colunas ausentes na API aparecem como "—" na célula.
- Linha de totais soma o que existe.
