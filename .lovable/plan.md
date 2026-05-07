# Nova rota `/biblioteca-bi`

Criar uma rota dedicada para a biblioteca de componentes BI, separada do catálogo técnico atual (`/bi-components-demo`).

## Mudanças

**`src/App.tsx`** — adicionar rota apelido apontando para o mesmo componente já existente:
```tsx
<Route path="/biblioteca-bi" element={<BiComponentsDemoPage />} />
```
Logo abaixo da rota `/bi-components-demo` (linha 85). Mantém a rota antiga funcionando para não quebrar links internos.

**`src/pages/BiComponentsDemoPage.tsx`** — pequeno ajuste no header para refletir o nome amigável quando acessado via `/biblioteca-bi`:
- Detectar `useLocation()`; se path = `/biblioteca-bi`, exibir título "Biblioteca BI — Componentes" (caso contrário mantém "Catálogo de Componentes BI").
- Sem qualquer outra mudança de conteúdo: a página continua mostrando todas as seções (KPIs, Gráficos, Tabelas, Filtros, Drill-down, Estados, Badges, Layout) com os mesmos mocks.

## Resultado
- `/biblioteca-bi` passa a ser o caminho oficial e amigável da biblioteca interna.
- `/bi-components-demo` continua respondendo (alias técnico).
- Nenhum impacto em outras telas, APIs ou autenticação.