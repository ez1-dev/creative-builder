

# Animações de Entrada nos KPIs com Framer Motion

## Mudanças

### 1. Instalar `framer-motion`
Adicionar dependência ao `package.json`.

### 2. Atualizar `KPICard` (`src/components/erp/KPICard.tsx`)
- Adicionar prop opcional `index?: number` para escalonamento (stagger)
- Envolver o wrapper externo do card com `motion.div` do framer-motion
- Animação: fade-in + slide-up (`opacity: 0→1`, `y: 20→0`)
- Delay escalonado: `index * 0.05s` para efeito cascata
- Duração: `0.4s` com easing suave

### 3. Atualizar `PainelComprasPage.tsx`
- Passar prop `index={i}` para cada `KPICard` no dashboard (usando o índice do array ou posição manual)

### Detalhes técnicos
- `motion.div` com `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ delay: index * 0.05, duration: 0.4 }}`
- Animação só executa na montagem inicial (sem `whileInView` para evitar re-trigger ao scroll)

