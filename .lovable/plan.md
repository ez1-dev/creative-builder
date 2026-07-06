# Centro de Custo nos módulos RH + séries dinâmicas

Renderizar o campo `centro_custo` que a API RH agora entrega e garantir que as novas séries `por_centro_custo` apareçam automaticamente no dropdown da Biblioteca BI. Sem cálculo no front, sem Supabase direto, sem hardcode de séries.

## 1. Tipos (`src/lib/rh/types.ts`)

Garantir `centro_custo?: string` em todos os tipos de detalhe que ainda não tenham:
- `ContratoExperienciaVencimentoItem`
- `ProgramacaoFeriasDetalheItem`
- `DeFeriasDetalheItem`
- `TurnoverAdmitidoDetalhe` / `TurnoverDemitidoDetalhe`
- `AbsenteismoDetalheItem`

(`ColaboradorDetalhe` já tem.)

## 2. Coluna "Centro de Custo" nos modais de drill

Adicionar a coluna (título: **Centro de Custo**, campo `centro_custo`, fallback `"-"`) nos modais RH. Posição sugerida: logo após "Filial".

Arquivos:
- `src/components/rh/QuadroDrillModal.tsx` — já lista `centro_custo`; validar apenas.
- `src/components/rh/TurnoverDrillModal.tsx`
- `src/components/rh/TurnoverEmpresaDrillModal.tsx` (abas admitidos + demitidos)
- `src/components/rh/AbsenteismoDrillModal.tsx`
- `src/components/rh/ProgramacaoFeriasDrillModal.tsx` (modo `periodo` e `de_ferias`)
- Modais do Contrato de Experiência em `src/components/rh/` (vencimentos, vencidos, por status — mapear no início da build)

## 3. Tabelas principais das páginas

Nas páginas listadas abaixo, adicionar a coluna Centro de Custo à tabela principal (mesma regra de posição e fallback):
- **RH-03** Contrato de Experiência — grid de vencimentos.
- **RH-04** Programação de Férias — grid de detalhe.
- Turnover/Absenteísmo já são renderizados via modais (item 2).

## 4. Séries dinâmicas "Por Centro de Custo" (Biblioteca BI)

O adapter `rhSeriesToOptions` / `rhSeriesToRecord` (`src/lib/rh/seriesAdapter.ts`) já expõe qualquer série vinda de `dashboard.series` de forma dinâmica. Passos:

- Auditar cada página RH (`ResumoFolhaPage`, `QuadroColaboradoresPage`, `ContratoExperienciaPage`, `ProgramacaoFeriasPage`, `TurnoverPage`, `AbsenteismoPage`) e garantir que:
  - O dropdown "Série" é montado a partir de `rhSeriesToOptions(dashboard.series)`.
  - Os dados do gráfico saem de `rhSeriesToRecord(dashboard.series)[chaveSelecionada]`.
  - Nada de listas fixas / `switch` por chave conhecida.
- Remover qualquer whitelist antiga que impeça `por_centro_custo`, `admissoes_por_centro_custo`, `demissoes_por_centro_custo`, `dias_por_centro_custo`, `folha_por_centro_custo` de aparecer.
- Mapear pontos como `{ label: p.label, valor: Number(p.valor ?? 0) }` para os gráficos (bar/donut/line já usam esse shape).

## 5. Drill por Centro de Custo (quando o gráfico for clicável)

Onde a página já tem drill ao clicar numa fatia/barra, adicionar o predicado `centro_custo === valorClicado`:
- RH-03: `vencimentos.filter(x => x.centro_custo === cc)`
- RH-04: `detalhe.filter(x => x.centro_custo === cc)`
- RH-05: `detalhe_admitidos` / `detalhe_demitidos`
- RH-06: `detalhe`

Não criar drill novo onde ainda não existe — apenas incluir CC no roteador de predicados já usado pela página.

## 6. RH-01 Resumo Folha — série "Folha por Centro de Custo"

- Aparece automaticamente pelo adapter.
- Se `pontos` vier vazio, exibir mensagem "Sem dados para esta série." (padrão já usado). Nenhum erro, nenhum toast.

## 7. Fora do escopo

- Nenhuma mudança em backend, Supabase, edge functions, migrations, RLS.
- Nenhum recálculo/agrupamento no front.
- Botões "Exportar Excel" permanecem inalterados (backend já inclui CC nas planilhas).
- Datas continuam com `formatDateBR` (parse manual `YYYY-MM-DD`).

## Notas técnicas

- Coluna renderizada como `<TableCell>{row.centro_custo || "-"}</TableCell>`.
- Ordem das colunas nos modais: Colaborador → Matrícula → Cargo → Empresa → Filial → **Centro de Custo** → demais campos específicos.
- A tela `/rh/resumo-folha` já mostra "Campo pendente na API" quando `filiais[].salario_base` não vem — comportamento mantido, sem alteração nesta task.

## Pré-condições de validação (usuário)

1. Rodar a view `rh_drill_eventos_view.sql` no backend (para o RH-01).
2. Reiniciar a API `8070`.
3. Abrir RH-01 a RH-06 e conferir coluna CC + série "Por Centro de Custo" no dropdown.
