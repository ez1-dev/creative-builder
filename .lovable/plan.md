

## Card de alerta piscante para OPs acima de 8h

### Diagnóstico
Hoje a tela `/auditoria-apontamento-genius` já calcula `kpis.acima8h` (quantidade de apontamentos acima de 8h) e exibe em um `KPICard` neutro junto com os demais KPIs. O usuário quer **destacar visualmente** esse indicador como um **alerta piscante**, para chamar atenção imediata quando houver OPs nessa condição.

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx` + 1 keyframe em `tailwind.config.ts` / `src/index.css`)

**1. Novo componente local `AlertaAcima8hCard`** (definido no próprio arquivo da página, logo acima de `AuditoriaApontamentoGeniusPage`):
- Recebe props: `quantidade: number`, `onClick: () => void` (abre o drill `acima8h` já existente).
- Renderização condicional:
  - Se `quantidade === 0` → renderiza um card **verde discreto** com ícone `ShieldCheck` e texto "Sem apontamentos acima de 8h" (sem piscar).
  - Se `quantidade > 0` → renderiza card **vermelho destacado**:
    - Borda grossa `border-2 border-destructive`
    - Fundo `bg-destructive/10`
    - Ícone `AlertTriangle` grande (28px) à esquerda, com `animate-pulse-alert` (piscando)
    - Texto principal: `{quantidade} apontamento(s) acima de 8h` em `text-2xl font-bold text-destructive`
    - Subtítulo: `Clique para ver detalhes` em `text-xs`
    - Halo externo via `shadow-[0_0_0_4px_hsl(var(--destructive)/0.15)]` com pulsação suave
    - `cursor-pointer` + `onClick` chamando `setKpiDrill({ kind: 'acima8h' })` (mesmo handler já usado pelo KPICard atual)
- Acessibilidade: `role="button"`, `aria-label="Alerta: apontamentos acima de 8 horas"`, `tabIndex={0}` e handler de `Enter`.

**2. Posicionamento no layout**
- Inserir o `AlertaAcima8hCard` **acima do grid de KPIs** (logo abaixo do `FilterPanel` / aviso de status), ocupando a largura total (`w-full`). Assim o alerta fica em destaque máximo e não se "perde" entre os 8 KPIs.
- Manter o `KPICard` "Acima de 8h" existente no grid (informativo, sem piscar) — o novo card é o destaque visual; o KPICard continua para consistência do painel.

**3. Animação de pulso (piscar)**
Adicionar em `tailwind.config.ts` dentro de `keyframes` e `animation`:
```ts
keyframes: {
  'pulse-alert': {
    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
    '50%':      { opacity: '0.55', transform: 'scale(1.06)' },
  },
  'glow-alert': {
    '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--destructive) / 0.45)' },
    '50%':      { boxShadow: '0 0 0 12px hsl(var(--destructive) / 0)' },
  },
},
animation: {
  'pulse-alert': 'pulse-alert 1.2s ease-in-out infinite',
  'glow-alert':  'glow-alert 1.6s ease-out infinite',
},
```
- Aplicar `animate-pulse-alert` no ícone e `animate-glow-alert` no card externo.
- Respeitar `prefers-reduced-motion`: envolver ambas animações com `motion-reduce:animate-none` nas classes do JSX, evitando piscar para usuários sensíveis.

**4. Comportamento**
- Clique no card → abre o `KpiDeepSheet` com `kind: 'acima8h'` (mesmo drill já existente, com paginação implementada anteriormente).
- Quantidade exibida usa exatamente `kpis.acima8h` para se manter coerente com o KPI já calculado.
- Quando `kpis.acima8h === 0`, o card verde aparece estático (sem animação) confirmando "tudo certo".

### Detalhes técnicos
- Sem novas dependências; usa Tailwind + lucide-react (`AlertTriangle`, `ShieldCheck`) já presentes.
- Sem mudança na lógica de cálculo, filtros, paginação ou drill.
- Acessibilidade: foco visível e suporte a teclado garantidos via `tabIndex` + handler de tecla.
- Reduced motion respeitado.

### Fora de escopo
- Som de alerta / notificação push.
- Persistir "marcado como visto" / dismiss.
- Replicar o padrão em outras telas (pode ser feito depois se desejado).

### Resultado
Quando houver apontamentos acima de 8h, um card vermelho largo, com ícone e borda piscando suavemente, aparece logo acima dos KPIs. Clicar abre o detalhamento dessas OPs. Quando não houver, um card verde discreto confirma que está tudo dentro do limite.

