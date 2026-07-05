## Objetivo

Adicionar bloco "Lista de Drills" em `/rh/quadro-colaboradores` que consome `dimensoes_drill` + `detalhe` do payload de `GET /api/rh/quadro-colaboradores/dashboard`, agrupando colaboradores client-side por qualquer dimensão retornada pela API, com drill até o colaborador.

Sem alterar gráficos, KPIs, tabela Empresa/Filial existentes. Sem novos endpoints. Sem regras de RH no front.

## Alterações

### 1. `src/lib/rh/quadroDashboardApi.ts`
- Estender `QuadroDashboard` com dois campos passthrough:
  - `dimensoes_drill?: { chave: string; label: string }[]`
  - `detalhe?: Array<Record<string, any>>` (com campos: `colaborador`, `matricula`, `empresa`, `filial`, `cargo`, `centro_custo`, `escolaridade`, `faixa_etaria`, `tempo_casa`, `sexo`, `situacao`, `vinculo`, `pcd`, `idade`, `dt_admissao`).
- Em `normalizeDashboard`, apenas repassar `raw.dimensoes_drill` e `raw.detalhe` sem transformação (a API já entrega rotulado).
- Exportar tipos `DrillDimension` e `ColaboradorDetalhe`.

### 2. Novo componente `src/components/rh/QuadroDrillCard.tsx`
- Props: `dimensoes: DrillDimension[]`, `detalhe: ColaboradorDetalhe[]`, `loading?: boolean`.
- Estado local: `chaveSel` — default `"empresa"` se presente em `dimensoes`, senão primeira dimensão.
- Se `dimensoes` vazio: exibir card discreto "Drills ainda não disponíveis na API." e retornar.
- Se `detalhe` vazio: card "Sem colaboradores para detalhar."
- UI:
  - Card com título "Lista de Drills".
  - Select "Drill por..." com options de `dimensoes` (usar `label`, `value=chave`).
  - Tabela agregada com colunas: Dimensão (label da chave), Colaboradores, Homens, Mulheres, PCD, Estagiários, Jovem Aprendiz.
  - Ordenação por Colaboradores desc.
  - Linhas clicáveis (`cursor-pointer`, hover) → abrem modal.
- Agrupamento com helpers exatamente conforme snippet do usuário (`normalizaValor`, `isMasculino`, `isFeminino`, `isPCD`, `isEstagiario`, `isAprendiz`, `agruparPorDimensao`), definidos no próprio arquivo.

### 3. Novo componente `src/components/rh/QuadroDrillModal.tsx`
- Dialog do shadcn (fecha por clique fora / botão Fechar / ESC).
- Props: `open`, `onOpenChange`, `label` (dimensão), `valor` (grupo), `itens: ColaboradorDetalhe[]`.
- Título: `{label}: {valor} — {itens.length} colaboradores`.
- Tabela scroll vertical (`max-h-[70vh] overflow-auto`), colunas: Colaborador, Matrícula, Cargo, Empresa, Filial, Centro Custos, Escolaridade, Faixa Etária, Tempo de Casa, Sexo, Situação, Vínculo, PCD, Idade, Data Admissão.
- Ordenar por `colaborador` asc.
- `dt_admissao` formatado por helper local `formatDateBR` (parse manual regex `^(\d{4})-(\d{2})-(\d{2})`, sem `new Date` / `toLocaleDateString`).
- Botão Fechar no rodapé. Sem exportação (padrão ausente para lista de colaboradores).

### 4. `src/pages/rh/QuadroColaboradoresPage.tsx`
- Importar `QuadroDrillCard`.
- Após o bloco `<EmpresaGrid />` (final da página, antes do fechamento do container), renderizar:
  ```
  <div className="mb-4">
    <QuadroDrillCard
      dimensoes={dashQ.data?.dimensoes_drill ?? []}
      detalhe={dashQ.data?.detalhe ?? []}
      loading={dashQ.isLoading}
    />
  </div>
  ```
- Nenhuma outra mudança na página.

## Validações

- Payload sem `dimensoes_drill` → bloco mostra mensagem "Drills ainda não disponíveis na API." (nada quebra).
- Selecionar "Empresa" → totais batem com tabela Empresa existente (ESTRUTURAL 206 / MONTAGEM EXTERNA 157 / GENIUS 49).
- Clicar em linha → modal com lista, ordenada por Colaborador, `dt_admissao` em `dd/MM/yyyy` sem shift de fuso.
- Typecheck OK.
