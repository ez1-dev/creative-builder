## Aplicar identidade visual HUB Gestão

### 1. Logo SVG (novo componente reutilizável)
- Criar `src/components/brand/HubLogo.tsx` com duas variantes recriadas em SVG vetorial a partir da imagem enviada:
  - **`symbol`** — hexágono "HD" (H azul #1565FF + D verde #22C55E com barras de gráfico ao centro). Usado na sidebar colapsada, no login e como base do favicon/PWA.
  - **`horizontal`** — símbolo + wordmark "HUB / GESTÃO" (Poppins Bold, HUB adaptativo à cor do fundo, GESTÃO em verde #22C55E). Usado na sidebar expandida.
- Props: `variant`, `className`, `wordmarkClassName` (para trocar a cor de "HUB" entre fundos escuros/claros).

### 2. Sidebar e Login
- `src/components/AppSidebar.tsx`: substituir o ícone `LayoutDashboard` + `<BrandName>` pelo `<HubLogo variant="horizontal">` quando expandida e `<HubLogo variant="symbol">` quando colapsada. Remove o `useBrand` da sidebar (o logo já carrega a marca).
- `src/pages/LoginPage.tsx`: substituir o círculo com cadeado pelo `<HubLogo variant="horizontal">` centralizado; adicionar a tagline **"Do dado à decisão."** logo abaixo do título; manter o `CardTitle` como subtítulo discreto ou remover para evitar duplicidade.

### 3. Favicon + PWA icons
- Gerar `public/favicon.svg` (símbolo hexagonal, mesmo SVG do componente) e novo `public/icon-192.png` / `public/icon-512.png` com o símbolo sobre fundo `#0B1D33` (maskable-safe area).
- Atualizar `index.html`: adicionar `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` e `<link rel="apple-touch-icon" href="/icon-192.png">`; remover o `favicon.ico` antigo (`rm public/favicon.ico`).
- `public/manifest.json`: manter os 192/512 apontando para os novos PNGs, `theme_color` continua `#3b82f6` mas será atualizado para `#1565FF` para bater com a paleta oficial; `background_color` fica `#0B1D33`.

### 4. Paleta oficial no design system
- `src/index.css`: atualizar os tokens semânticos HSL para refletir:
  - `--primary`: azul `#1565FF` (HSL `217 100% 54%`).
  - `--accent` / cor de sucesso/verde de marca: `#22C55E` (HSL `142 71% 45%`).
  - Fundos escuros da sidebar/login: `#0B1D33` (HSL `215 65% 12%`).
  - Neutros: `#64748B` (muted-foreground) e `#E5E7EB` (border/muted).
- `tailwind.config.ts`: adicionar variáveis auxiliares `--brand-blue`, `--brand-cyan` (#00A3FF), `--brand-green` (#22C55E), `--brand-lime` (#8BD62B) mapeadas como cores Tailwind (`brand.blue`, `brand.green`, etc.) para uso pontual sem quebrar o restante do sistema.
- Ajustar apenas tokens — nenhum componente ganha cor hardcoded.

### 5. Tipografia Poppins
- `index.html`: adicionar `<link>` do Google Fonts para Poppins 400/500/700 (com `preconnect`).
- `src/index.css`: definir `body { font-family: 'Poppins', system-ui, sans-serif; }` e atualizar `tailwind.config.ts` com `fontFamily.sans: ['Poppins', ...defaultTheme.fontFamily.sans]` para todo o app herdar.

### 6. Verificação final
- Rodar `rg` para garantir que nenhuma referência antiga ao logo `LayoutDashboard` da sidebar/login sobrou.
- Build automático + inspeção visual (sidebar expandida/colapsada, login, favicon aba, manifest).

### Detalhes técnicos
- O SVG é recriado à mão (paths do hexágono + letras H/D + 3 barras verticais do gráfico interno), sem depender do binário enviado — mantém nitidez em qualquer tamanho e permite tema claro/escuro apenas trocando `currentColor` no wordmark.
- Cores usadas apenas via CSS custom properties para respeitar a regra do design system.
- Poppins carregada com `display=swap` para evitar FOIT.
