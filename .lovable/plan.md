## Objetivo

Ajustar `RH > Quadro de Colaboradores` para não marcar como "Campo pendente na API" valores que já vêm dentro de blocos de distribuição do payload, e garantir que o histórico use o endpoint dedicado.

## Arquivos alterados

- `src/lib/rh/quadroDashboardApi.ts` — normalização mais tolerante.
- `src/pages/rh/QuadroColaboradoresPage.tsx` — usar valores derivados, ajustar título e regra do bloco Empresa.

Nenhum novo endpoint, nenhuma tabela no Cloud, nenhuma regra de negócio nova no front.

## Mudanças por item

### 1. Sexo (Masculino / Feminino)

Em `normalizeDashboard`, após tentar `kpis.masculino` / `kpis.feminino`:

- Se ausentes, procurar bloco de sexo em: `distribuicoes.sexo`, `sexo`, `quebras.sexo`, `dados.sexo`, `por_sexo`, `distribuicao_sexo`.
- Aceitar 3 formatos:
  - Array `[{label,valor}]`
  - Array `[{sexo,quantidade|valor|qtd|total}]`
  - Objeto `{ "M": 360, "F": 67 }`
- Normalizar label/chave (case/acentos removidos):
  - `M`, `MASCULINO`, `MALE` → masculino
  - `F`, `FEMININO`, `FEMALE` → feminino
- Se o bloco de sexo existir mas faltar M ou F → valor 0 (não `null`).
- Só marcar `masculino`/`feminino` como `null` (pendente) se **nem** o KPI **nem** a distribuição existirem.
- Sempre popular `dashboard.sexo` (breakdown normalizado com labels "Masculino"/"Feminino") para o donut.

Card KPI de Masculino/Feminino: adicionar percentual sobre `kpis.total` no subtítulo quando total > 0 (`{n} ({pct}%)`). Implementado via pequena extensão do `KpiOrPending` (prop `total` opcional) — mudança de apresentação apenas.

### 2. Licença maternidade

Fallback quando `kpis.licenca_maternidade` não vier:

- Procurar distribuição em: `situacoes`, `afastamentos`, `distribuicoes.situacao`, `quebras.situacao`, além dos já existentes (`situacao`, `por_situacao`).
- Se bloco existir: procurar item cujo label normalizado contenha `MATERNIDADE`, ou `LIC MATERNIDADE`/`LIC.MATERNIDADE`, ou cujo `codigo`/`cd_situacao` == `6`.
- Achou → valor. Bloco existe e não achou → 0. Bloco não existe → `null` (pendente).

Aplicar a mesma lógica de fallback via distribuição de situação para: `ferias` (label FERIAS), `auxilio_doenca` (AUXILIO DOENCA / AUX DOENCA), `acidente` (ACIDENTE), `trabalhando` (TRABALHANDO / ATIVO). Mesma regra "bloco existe = 0, bloco ausente = null" — para não haver `-` quando o payload traz a quebra de situação.

### 3. Empresa

Manter comportamento atual:

- Procurar `distribuicoes.empresa`, `empresa`, `empresas`, `por_empresa`.
- Se vier: renderizar breakdown (labels vindas da API, ex.: ESTRUTURAL, GENIUS, MONTAGEM EXTERNA).
- Se não vier: card com mensagem `Classificação Empresa pendente de regra na API`.
- Nenhuma classificação derivada no front.

### 4. Histórico Nº Colaboradores

Já usa `/api/rh/quadro-colaboradores/historico`. Ajustes:

- Estender `fetchQuadroHistorico` para aceitar payloads adicionais: `resp.historico`, além de `dados/items/data/array`.
- Aceitar chaves de competência: `anomes`, `anomes_competencia`, `mes`, `competencia`.
- Aceitar chaves de valor: `colaboradores`, `total_colaboradores`, `qtd_colaboradores`, `quantidade`, `valor`, `total`.
- Ordenar crescente por competência antes de retornar.
- Card: renomear título para `Histórico Nº Colaboradores` (permanece `AreaChartCard`, eixo X = mês/competência formatada `MM/AAAA`, eixo Y = quantidade).
- Sempre renderizar o card (com skeleton em loading e estado vazio explícito), nunca ocultá-lo quando a query estiver ativa.

### 5. Regra geral

Consolidada dentro de `normalizeDashboard`: para cada KPI mapeado, tenta KPI direto → fallback em distribuição correspondente → só então marca `null`. `KpiOrPending` continua exibindo "Campo pendente na API" somente para `null`/`undefined`.

## Validação (data_ref = 2026-04-30)

- Total: 427, Masculino: 360 (com %), Feminino: 67 (com %)
- Jovem Aprendiz: 24, Estagiários: 3, PCD: 11
- Licença maternidade: valor real se vier na distribuição, 0 se distribuição existir sem maternidade, pendente só se distribuição de situação não vier
- Empresa: mensagem de pendente enquanto API não retornar bloco
- Histórico: gráfico renderizado a partir de `/historico`

## Fora de escopo

Backend/FastAPI, cálculo de headcount no front, novas tabelas Cloud, demais telas do RH.