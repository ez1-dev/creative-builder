## Objetivo
Restaurar a renderização da aplicação na rota inicial, eliminando a causa atual da tela totalmente branca.

## O que será feito
1. Remover o bloqueio causado por `framer-motion` no carregamento inicial.
   - Substituir os usos de `motion.div` em componentes críticos por alternativas sem essa dependência.
   - Prioridade para `src/components/erp/KPICard.tsx`, que é importado por páginas centrais e pode quebrar a árvore inteira quando o bundle de `framer-motion` falha.
   - Ajustar também o uso em `src/pages/AuditoriaApontamentoGeniusPage.tsx` para manter consistência e evitar novas falhas em navegações futuras.

2. Preservar o comportamento visual com CSS/Tailwind.
   - Trocar as animações de entrada por classes utilitárias simples ou remover a animação onde não for essencial.
   - Garantir que os cartões KPI e os blocos da auditoria continuem funcionais sem regressão de layout.

3. Validar o caminho de renderização principal.
   - Confirmar que `/` volta a exibir a interface em vez de uma página vazia.
   - Verificar se login, layout e páginas iniciais continuam montando normalmente após a remoção da dependência problemática.

## Diagnóstico confirmado
A folha `src/index.css` já está corrigida e não parece ser a causa atual.
O sinal mais forte encontrado agora é este erro de carregamento no preview:
- `GET /node_modules/.vite/deps/framer-motion.js ... 502`

Como o app importa `framer-motion` em componentes usados pela interface principal, uma falha nesse módulo pode impedir a montagem do React e resultar em tela branca.

## Arquivos envolvidos
- `src/components/erp/KPICard.tsx`
- `src/pages/AuditoriaApontamentoGeniusPage.tsx`
- Validação em `src/App.tsx` e fluxo inicial já revisado

## Detalhes técnicos
```text
Rota inicial
  -> App.tsx
    -> páginas centrais
      -> KPICard
        -> import de framer-motion
          -> bundle Vite 502
            -> app não monta corretamente
```

Abordagem proposta:
- substituir `motion.div` por `div`
- mover o efeito visual para Tailwind/CSS quando necessário
- evitar que uma biblioteca opcional de animação seja requisito para o app carregar

## Resultado esperado
A aplicação deixa de abrir em branco e volta a renderizar a tela normalmente, mesmo sem depender do bundle de `framer-motion` no boot inicial.