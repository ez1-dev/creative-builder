

## Reorganização visual dos filtros da Auditoria Apontamento Genius

### Diagnóstico
O `FilterPanel` atual joga tudo em um grid plano de 5 colunas: datas avulsas, botão "Últimos 12 meses", atalhos por semana, navegador semanal, 5 campos de texto/combobox e 2 switches. Resultado: linhas desalinhadas, "Últimos 12 meses" flutuando isolado, switches espremidos no fim, e o navegador semanal compete com os campos de busca pelo espaço.

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`, ~linhas 1108–1251)

Reagrupar o conteúdo do `FilterPanel` em **3 blocos verticais bem demarcados**, cada um com seu próprio título pequeno (`text-[11px] font-semibold uppercase text-muted-foreground`) e um `Separator` ou borda sutil entre eles. O `FilterPanel` passa a receber um único `<div className="space-y-3 col-span-full">` em vez de 10+ filhos soltos no grid.

**Bloco 1 — Período**
Linha única com 3 sub-áreas alinhadas:
```
[ Data inicial ] [ Data final ] | [ Últimos 12 meses ] | [ ◀  S17/2026 · 20/04 – 26/04  ▶  Hoje ]
                                | [ Esta semana ] [ Sem. passada ] [ Últimas 4 sem. ]
```
- Esquerda: dois inputs `date` lado a lado (largura fixa `w-[140px]` cada).
- Centro: botão "Últimos 12 meses" + linha com os 3 atalhos semanais (`flex flex-wrap gap-1`).
- Direita: o navegador semanal em uma "pill" compacta (já existe, só muda a posição).
- Tudo dentro de um `flex flex-wrap gap-x-4 gap-y-2 items-end`, garantindo que em telas estreitas ele quebre naturalmente.

**Bloco 2 — Filtros de busca**
Grid próprio `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3` com os 5 campos atuais na ordem mais usada:
1. Número da OP
2. Status da OP
3. Origem (GENIUS)
4. Código produto
5. Operador

Justificativa: "Status da OP" sobe para o segundo lugar porque é o filtro mais usado para recortar problemas; os outros seguem ordem alfabética/lógica de identificação.

**Bloco 3 — Opções rápidas (toggles)**
Linha horizontal `flex flex-wrap gap-x-6 gap-y-2` com:
- `Somente discrepância`
- `Somente acima de 8h`

Cada switch + label num grupo `inline-flex items-center gap-2`, sem o `pt-5` artificial atual. Os botões `Pesquisar` / `Limpar` continuam onde já estão (no rodapé do `FilterPanel`).

### Detalhes técnicos
- Usar `Separator` (`@/components/ui/separator`) entre blocos, ou simplesmente `border-t pt-3` no segundo e terceiro blocos.
- Como o `FilterPanel` atual aplica um `grid` nos filhos, envolver todo o conteúdo em um único `<div className="col-span-full space-y-3">` — assim o grid externo não interfere e cada bloco controla seu próprio layout.
- Preservar todos os handlers, estados e helpers existentes (`inicioSemana`, `fimSemana`, `addWeeks`, `labelSemana`, `toISODate`).
- Sem mudança em nenhum filtro funcional, backend, KPIs ou paginação.
- Acessibilidade: cada `<Label>` continua associado ao seu input via `htmlFor` onde já estiver (switches mantêm o vínculo).

### Resultado visual esperado
```text
┌─ Filtros ──────────────────────────────────────────────────────────────────┐
│ PERÍODO                                                                    │
│ [Data inicial][Data final]  [Últimos 12 meses]   ◀ S17/2026·20–26 abr ▶ Hoje│
│                             [Esta sem][Sem. passada][Últimas 4 sem]        │
│ ──────────────────────────────────────────────────────────────────────────  │
│ FILTROS DE BUSCA                                                           │
│ [N. OP] [Status OP] [Origem] [Código produto] [Operador]                   │
│ ──────────────────────────────────────────────────────────────────────────  │
│ OPÇÕES RÁPIDAS                                                             │
│ ⏻ Somente discrepância    ⏻ Somente acima de 8h                            │
│                                                                            │
│ [🔍 Pesquisar]  [✕ Limpar]                                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

### Fora de escopo
- Mudar comportamento de qualquer filtro.
- Salvar preferências entre sessões.
- Adicionar novos filtros.

