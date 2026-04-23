

## Drill-down profundo nos cards de Status real da OP (E/L/A/F/C)

### Escopo
Hoje os 5 cards de status real (Emitidas/Liberadas/Andamento/Finalizadas/Canceladas) abrem um Popover com `OP {numop} → {produto}` (top 15). O usuário quer ir até o **último nível de informação**, focando em **OPs com inconsistência** dentro de cada status.

### Mudanças (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Enriquecer agregação por status (`kpiDrilldowns.opsPorStatus`)**

Substituir o `Map<numop, produto>` por um agregado completo por OP dentro de cada letra de `sitorp`:

```ts
type OpAgg = {
  numero_op: string;
  produto: string;            // descricao_produto || codigo_produto
  codigo_produto: string;
  origem: string;
  apontamentos: number;       // total de linhas dessa OP
  total_horas: number;        // soma horas_realizadas
  inconsistencias: number;    // sem_inicio + sem_fim + divergente + acima_8h
  sem_inicio: number;
  sem_fim: number;
  divergentes: number;
  acima_8h: number;
  operadores: Set<string>;
  ultimo_apontamento: string; // data ISO mais recente
  linhas: any[];              // todas as linhas brutas dessa OP (para nível mais profundo)
  sitorp: string;
};
```

Para cada `letra` ∈ {E,L,A,F,C} ordenar:
1. `inconsistencias` desc
2. `total_horas` desc
3. `numero_op` asc

Top 30 OPs por status (em vez de 15) — quem tem inconsistência aparece primeiro.

**2. Nova lista `details` rica nos 5 KPICards de status**

`KPICard.details` aceita `{label, value}`. Manter compatibilidade mas mostrar mais informação:

- `label`: `OP {numop} · {produto curto até 32 chars}` — com prefixo `⚠ ` se `inconsistencias > 0`.
- `value`: `{apontamentos} apt · {total_horas}h` + `· ⚠{inconsistencias}` quando houver.

Isso mantém o Popover compacto existente, mas já dá visão executiva.

**3. Drill-down profundo: novo Sheet "Detalhes do Status"**

Adicionar um segundo Sheet (`statusOpDrawerAberto`) que **substitui o popover** quando o usuário quer detalhe completo. Para isso:

- Adicionar prop `onClick` opcional no `KPICard` (já tem `cursor-pointer` quando `details` existe). Ao clicar no card, em vez de abrir Popover, abrir o Sheet customizado, carregando o status correspondente.
- Decisão UX: **manter popover** (clique simples = visão rápida) e adicionar **botão "Ver tudo →"** no rodapé do Popover que abre o Sheet. Isso preserva o padrão atual e adiciona o nível profundo só sob demanda.
- Como o `KPICard` não expõe slot de footer no Popover, criar um novo componente local `StatusOpDrillCard` (wrapper sobre Card+Popover, copiando o estilo do `KPICard`) usado apenas nos 5 cards de status. Os outros 7 KPIs continuam usando `KPICard`.

**4. Estrutura do Sheet "Detalhes do Status {label}"** (lateral, `side="right"`, `w-[920px] sm:max-w-[920px]`)

Conteúdo em 3 níveis:

**Nível 1 — Header com mini-KPIs do status**
- Total de OPs, OPs com inconsistência, total de apontamentos, total de horas, operadores únicos, top 3 origens.

**Nível 2 — Tabela de OPs (linha = OP única)**
Colunas: `OP`, `Produto`, `Origem`, `Apontamentos`, `Horas`, `Operadores`, `Último apont.`, `Inconsistências (badges coloridos: SI/SF/DIV/>8h)`.
- Linhas com inconsistência destacadas (`bg-destructive/5`).
- Filtro local: `[Todas | Só com inconsistência]` (toggle).
- Busca rápida por OP/produto/operador.
- Ordenação por inconsistências desc default; clicável por coluna.
- Click na linha → expande **Nível 3** inline (accordion).

**Nível 3 — Apontamentos brutos da OP** (todos os `linhas` da OP)
Tabela compacta: `Data`, `Hora`, `Operador (numcad)`, `Estágio`, `Seq Rot`, `Seq Apont`, `Turno`, `H. Realizadas`, `Total Dia Op.`, `Status Mov.`, `Status OP nativo (sitorp)`, com mesmo realce de cor da grid principal.
- Botão "Abrir no drawer de OP" reutiliza `abrirDetalhesOp(linha)` existente para pular para o drawer já implementado de OP individual.
- Botão "Copiar JSON" da OP (debug).
- Botão "Filtrar grid principal por esta OP" → seta `filters.numop` e dispara busca.

**5. Estado novo**
```ts
const [statusOpDrillAberto, setStatusOpDrillAberto] = useState(false);
const [statusOpDrillLetra, setStatusOpDrillLetra] = useState<'E'|'L'|'A'|'F'|'C'|null>(null);
const [statusDrillSomenteInconsist, setStatusDrillSomenteInconsist] = useState(false);
const [statusDrillBusca, setStatusDrillBusca] = useState('');
const [statusDrillOrdem, setStatusDrillOrdem] = useState<'inconsist'|'horas'|'apt'|'op'>('inconsist');
const [opExpandidaNoDrill, setOpExpandidaNoDrill] = useState<string | null>(null);
```

**6. Aviso de escopo**
Topo do Sheet: alerta `Info` quando `discrepanciasParciais === true` informando que detalhamento cobre apenas a página atual (N de M).

### Comportamento resultante

- Click no card de status → Popover compacto (visão rápida) com top OPs marcadas com ⚠ se houver inconsistência + botão "Ver tudo →".
- Click em "Ver tudo →" → Sheet lateral com mini-KPIs, tabela de OPs filtráveis e drill nível 3 (apontamentos brutos) expandível inline.
- Possível pular do drill para o drawer de OP existente ou aplicar filtro da OP na grid principal.

### Fora de escopo
- Buscar páginas adicionais para drill global (mantém escopo "página atual"); botão pode aparecer com tooltip "Carregue mais páginas para análise completa".
- Mudar backend.
- Persistir estado do drill entre buscas.

### Resultado
Os 5 cards de status real ganham drill-down em três níveis (resumo do status → OPs do status com inconsistência destacadas → apontamentos brutos da OP), permitindo investigar até a raiz sem sair da tela.

