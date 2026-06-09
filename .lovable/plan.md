## Adicionar Mapa do Brasil (BrazilMapCard) em todos os lugares

### 1. Catálogo `/biblioteca-bi` — showcase visual
**Arquivo:** `src/pages/BiComponentsDemoPage.tsx`
- Já está na seção "Gráficos" (linha 485). Adicionar também na seção **"Dashboard Pronto — Gestão de Compras"** (linha 326) caso `ComprasDashboardTemplate` ainda não exiba — verificar e, se faltar, inserir um `BrazilMapCard` lá com mock de UFs.

### 2. `visualCatalog.ts` — permissões por perfil
**Arquivo:** `src/lib/visualCatalog.ts`
Adicionar chave `*.chart-mapa-brasil` aos módulos que fazem sentido geográfico:
- `Manutenção de Frota` → `frota.chart-mapa-brasil`
- `Manutenção de Máquinas` → `maquinas.chart-mapa-brasil`
- `Passagens Aéreas` → `passagens.chart-mapa-brasil` (já existe `chart-top-uf` — adicionar o cartograma também)
- `Painel de Compras` → `compras.chart-mapa-brasil`
- `Produção – Dashboard` → `producao.mapa-brasil`

### 3. Assistente IA + Diálogo Aplicar Componente
Já funciona — `brazil-map` está registrado em `src/lib/bi/componentRegistry.tsx` (linha 418). **Sem alterações.** Apenas validar.

### 4. Páginas reais de dashboard
Inserir o `BrazilMapCard` **dentro de `<VisualGate visualKey="...chart-mapa-brasil">`** nas páginas listadas, agregando dados por UF a partir das fontes já existentes:

- **`src/components/passagens/PassagensDashboard.tsx`** — agrega `uf_destino` somando `valor` (dados já em memória)
- **`src/pages/PainelComprasPage.tsx`** — se o `dashboard` retornar UF do fornecedor, agregar; senão pular
- **`src/components/frota/FrotaDashboard.tsx`** — agregar por UF do veículo/CC se disponível; senão pular
- **`src/components/maquinas/MaquinasDashboard.tsx`** — idem

Cada página apenas calcula `[{uf, valor}]` via `useMemo` e renderiza o card; sem alterar lógica de fetch.

### Fora de escopo
- Não alterar `BrazilMapCard.tsx`, `componentRegistry.tsx`.
- Não criar endpoints novos — usar apenas dados que cada página já tem em memória. Se a página não tiver UF disponível, **pular** e anotar no commit.
- Sem nova permissão padrão — perfis começam sem acesso ao novo `chart-mapa-brasil` e o admin libera em Configurações.
