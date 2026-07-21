## Plano

1. **Corrigir a inicialização do modo Sintético**
   - Ajustar o efeito de entrada no modo `SINTETICO` para usar `childrenMap` em vez de percorrer apenas `linhas` diretamente.
   - Colapsar os pais que possuem filhos `ANALITICA` reais.
   - Calcular o nível mais adequado para `nivelExibido`, usando o nível mais raso desses pais, para que a grade comece realmente em formato sintético/recolhido.

2. **Ajustar o filtro de renderização da grid**
   - Manter a regra especial para DRE Sintético: linhas `ANALITICA` só aparecem quando o pai imediato estiver expandido.
   - Garantir que `isHiddenByAncestor(l)` não bloqueie indevidamente o filho quando o próprio pai imediato já foi expandido.
   - Preservar as regras atuais para linhas especiais, virtuais, técnicas, filtros ativos e Balanço.

3. **Preservar controles existentes**
   - Manter `Expandir tudo`, `Recolher tudo` e seletor de nível operando sobre `collapsed`/`nivelExibido`.
   - Não alterar `ANALITICO`, `NIVEL3`, Balanço, dados ou backend.

4. **Validação**
   - Verificar visualmente a rota atual em modo Sintético.
   - Confirmar que o chevron começa como recolhido nas classificações relevantes.
   - Clicar em uma classificação e validar que os filhos analíticos aparecem; clicar novamente recolhe.
   - Alternar para Analítico e confirmar comportamento preservado.