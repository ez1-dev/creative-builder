## Problema

No modo **Sintético** da visualização da DRE, clicar no chevron (▶) ao lado da classificação não abre a árvore — nenhum filho aparece.

## Causa

Em `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` (linha 2556), o filtro de renderização exclui **todas** as linhas `tipo_linha === "ANALITICA"` quando `modo === "SINTETICO"` (e o modelo não é Balanço). Como esse filtro é global, o estado de colapso/expansão do pai é ignorado: mesmo com o pai "aberto", os filhos analíticos continuam ocultos, então o clique no chevron não muda nada visível.

Além disso, o estado inicial de `collapsed` é vazio (tudo "aberto"), então o chevron nasce como ▼ mas sem efeito prático — reforçando a percepção de que "não abre".

## Correção

Escopo: apenas UI da visualização da DRE. Não altera dados, backend, nem o modo Analítico/Nível 3.

1. **Ajustar o filtro de renderização (linha ~2553-2558)**  
   Trocar a regra "esconde ANALITICA sempre que modo=SINTETICO" por:  
   - Se `l.tipo_linha === "ANALITICA"` **e** `modo === "SINTETICO"` **e** o modelo é DRE → mostra somente se o pai imediato estiver expandido (ou seja, `l.linha_pai_id` **não** está em `collapsed` **e** `isHiddenByAncestor(l)` é falso).  
   - Demais casos continuam iguais.
   
   Assim, sintético parte "fechado" e o clique no chevron do pai passa a revelar os analíticos daquele grupo.

2. **Inicializar `collapsed` ao entrar em Sintético**  
   Adicionar efeito equivalente ao já existente para "ANALITICO" (linhas 1113-1118): quando `modo === "SINTETICO"`, preencher `collapsed` com os IDs de todos os pais que têm filhos `ANALITICA` (via `childrenMap`), e definir `nivelExibido` como o nível-folha mais raso desses pais. Isso garante que a árvore começa recolhida no nível de classificação e o chevron muda de estado a cada clique.

3. **Manter compatibilidade**  
   - "Expandir tudo" / "Recolher tudo" / seletor de Nível continuam funcionando (já operam sobre `collapsed`/`nivelExibido`).  
   - Balanço permanece intacto (a nova regra é escopada a `tipoModelo !== "BALANCO"`).  
   - Linhas especiais, virtuais (VINCULAR/DRE), técnicas e 000 seguem com as regras atuais.

## Validação

- Abrir `/contabilidade/dre-studio/:id/visualizacao` em modo Sintético: apenas classificações visíveis, chevron ▶ ao lado.  
- Clicar no chevron de uma classificação → filhos analíticos aparecem; clicar de novo → recolhe.  
- Alternar para Analítico → todas as linhas expandidas (comportamento atual preservado).  
- Balanço: nenhum efeito colateral.
