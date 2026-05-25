
## Objetivo

Deixar o ERP utilizável em **TV 65"** tanto como **mural fixo** quanto para **operar** sentado/em pé, cobrindo ambas as resoluções comuns (Full HD 1920×1080 e 4K 3840×2160 a 100%). Sem PWA.

## Estratégia

Duas camadas combinadas:

1. **Responsividade global "big screen"** — ativa automaticamente em qualquer viewport ≥1920 px. Aproveita o espaço, aumenta tipografia e quebra grids em mais colunas. Não muda nada para quem usa monitor normal.
2. **Modo Wallboard opcional (`?tv=1`)** — rota/flag que esconde sidebar/header, ativa auto-refresh e usa tipografia ainda maior. Para deixar a TV exibindo um dashboard 24/7.

## Mudanças técnicas

### 1. Tailwind — novos breakpoints
`tailwind.config.ts`:
```ts
theme: {
  screens: {
    sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
    '3xl': '1920px',  // Full HD TV
    '4xl': '2560px',  // QHD / 4K com zoom 150%
    '5xl': '3200px',  // 4K nativo
  },
  ...
}
```

### 2. Escala global tipográfica em TV
`src/index.css` — usar `clamp()` no `html { font-size }` só acima de 1920 px:
```css
@media (min-width: 1920px) { :root { font-size: 18px; } }
@media (min-width: 2560px) { :root { font-size: 20px; } }
@media (min-width: 3200px) { :root { font-size: 24px; } }
```
Como o Tailwind usa `rem`, tudo escala proporcionalmente sem reescrever componente.

### 3. Remover travas de largura
Remover/expandir `max-w-7xl` em páginas-alvo, principalmente:
- `src/components/AppLayout.tsx` (se houver wrapper).
- `src/pages/ManutencaoMaquinasCompartilhadoPage.tsx`, `ManutencaoFrotaCompartilhadoPage.tsx`, `PassagensAereasCompartilhadoPage.tsx` → `max-w-7xl 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-none`.

### 4. Biblioteca BI (`src/components/bi/*`)
- KPI cards: `text-2xl 3xl:text-4xl 4xl:text-5xl` no valor; `text-xs 3xl:text-base` no label.
- Gráficos (`PaginaDashboardTemplate`, `useDashboardData`): grid passa de `lg:grid-cols-3` para `lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-6`.
- Altura mínima de cards de gráfico cresce em 3xl (`min-h-[260px] 3xl:min-h-[380px] 4xl:min-h-[480px]`).

### 5. Páginas-alvo (aplicar mesmo padrão)
- `src/pages/producao/ProducaoDashboardPage.tsx`
- `src/pages/producao/CargaDashboardPage.tsx` e `CargaRecursosDashboardPage.tsx`
- `src/pages/producao/LeadTimeProducaoPage.tsx`
- `src/pages/producao/ProgramacaoPage.tsx`
- `src/pages/FaturamentoGeniusPage.tsx`
- `src/pages/PainelComprasPage.tsx`
- `src/pages/DemonstrativoComprasRecebimentosPage.tsx`
- `src/pages/NotasRecebimentoPage.tsx`

Padrão: remover `max-w-*` desnecessário, padding `p-4 3xl:p-6 4xl:p-10`, headings `text-xl 3xl:text-3xl`.

### 6. Modo Wallboard (`?tv=1`)
- Hook `useTvMode()` lê `?tv=1` da URL.
- `AppLayout`: quando `tvMode`, esconde `AppSidebar`, esconde `HeaderInfo`, aplica `text-lg 3xl:text-2xl` no `<main>`.
- Auto-refresh: cada hook `useDashboardData` aceita `refetchInterval` e, em modo TV, usa 60 s por padrão.
- Botão discreto "Modo TV" no header de cada dashboard alvo adiciona `?tv=1` e abre em nova aba.

### 7. Acessibilidade visual em TV
- `:focus-visible` reforçado em 3xl: `3xl:outline-2 3xl:outline-primary`.
- Contraste mantido (tokens semânticos já existentes).

## Fora do escopo

- PWA / manifest / service worker.
- Navegação por controle remoto (D-pad).
- Telas administrativas (Configurações, ETL, SGU) — continuam responsivas mas sem otimização TV.
- Backend FastAPI e tabelas `bi_*`.

## Critério de pronto

- Em 1920×1080, dashboards-alvo ocupam toda a largura, KPIs ~32 px, gráficos ~380 px altura.
- Em 3840×2160 nativo (sem zoom), idem porém com 5 colunas onde antes eram 3, fontes ~48 px.
- `?tv=1` esconde chrome e ativa auto-refresh.
- Monitores comuns (≤1536 px) ficam **idênticos** ao que estão hoje.
- Sem rolagem horizontal indesejada; sem cores hardcoded.

## Validação

Após implementar, abrir o preview em:
- 1920×1080 (Full HD TV)
- 2560×1440 (4K com zoom 150%)
- 3840×2160 (4K nativo)
e verificar Produção Dashboard, Faturamento Genius e Painel Compras em modo normal e `?tv=1`.
