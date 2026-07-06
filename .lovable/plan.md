## Problema

Nas telas do RH (ex.: /rh/quadro-colaboradores no screenshot enviado) os cards aparecem "flutuando" com grandes espaços verticais vazios entre eles — o donut "Sexo" tem uma faixa vazia enorme à direita e outra faixa vazia até "Escolaridade" / "Faixa etária" logo abaixo. Isso acontece porque:

1. Os layouts salvos têm `y` fixos com folgas grandes entre widgets.
2. O `react-grid-layout` só compacta cada coluna até bater em outro widget — se um widget largo ocupa a linha acima, os cards abaixo não conseguem "subir" para preencher o espaço.
3. As margens/altura de linha (`margin=[16,16]`, `rowHeight=60`) foram herdadas do módulo de Passagens e ficam largas para os dashboards do RH, que têm muitos cards médios.

## Objetivo

Deixar todas as telas do RH com espaçamento uniforme e denso — como um dashboard "colado" — sem alterar o layout do módulo de Passagens.

## Estratégia

### 1. Densidade dedicada para o grid do RH (`src/components/passagens/PassagensLayoutGrid.tsx`)

- Adicionar prop opcional `density?: "default" | "compact"`.
- `default` mantém `margin=[16,16]` + `rowHeight=60` (Passagens continua igual).
- `compact` usa `margin=[12,12]` + `rowHeight=44` — dá mais granularidade para o RH e diminui os "vãos" residuais.

### 2. Compactação vertical em modo visualização (`src/components/rh/RhDashboardGrid.tsx`)

Adicionar utilitário local `compactVerticalLayout(widgets)`:

- Ordena por `(y, x)`.
- Faz varredura coluna-a-coluna calculando, para cada widget, o menor `y` possível respeitando colisões com widgets já posicionados.
- Retorna cópias dos widgets com `y` recalculado.

Aplicar essa função no `RhDashboardGrid` **somente quando `editing === false`** — em edição a posição bruta continua sendo a fonte da verdade (para não brigar com o drag do usuário). O resultado é passado para o grid, então o "vão" some visualmente. Os `y` reescritos são apenas para render — não sobrescrevem o que está salvo até o usuário editar/salvar de fato.

### 3. Repasse do `density="compact"`

- `RhDashboardGrid` passa `density="compact"` para `PassagensLayoutGrid`.
- Todas as 6 páginas do RH herdam automaticamente (não precisam mudar).

## Fora de escopo

- Não alterar layouts salvos no banco (não fazer migração de `y`). A compactação é só no render.
- Não mexer no módulo Passagens/Frota/Máquinas — o `density` deles fica no `"default"`.
- Não mudar chrome de edição (drag handle, botões +/-, setas).

## Validação

- `/rh/quadro-colaboradores`: o gap enorme entre "Sexo" e "Escolaridade/Faixa etária" fecha; os cards ficam colados verticalmente.
- Outras telas do RH (Turnover, Absenteísmo, Contrato Experiência, Programação Férias, Resumo Folha): mesma sensação de densidade.
- `/passagens-aereas` continua com o espaçamento atual.
- Ao entrar em modo edição, o layout volta ao formato salvo (sem compactação forçada) para o usuário arrastar livremente.
