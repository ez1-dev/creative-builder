# Corrigir mapa de destinos que não está aparecendo

## Problema observado
No preview atual, as bolhas dos destinos aparecem, mas a base do mapa do Brasil não fica legível — visualmente vira um bloco cinza sem contorno claro.

Também há um warning no console ligado ao uso do tooltip dentro do SVG do mapa, o que indica que a interação dos marcadores precisa ser ajustada.

## Plano
1. Ajustar a camada base do mapa em `src/components/passagens/MapaDestinosCard.tsx` para que o Brasil fique visível de forma clara:
   - aumentar contraste do `fill` e do `stroke` das `Geography`
   - definir melhor a espessura/opacidade das bordas
   - evitar que o mapa se confunda com o fundo do card

2. Refinar o enquadramento do mapa:
   - revisar `projectionConfig` (`scale`, `center` e área útil do SVG)
   - garantir que o Brasil ocupe bem o espaço sem parecer um retângulo chapado
   - manter os marcadores alinhados com as cidades

3. Corrigir a interação dos marcadores no SVG:
   - remover a composição inválida atual do Radix Tooltip dentro de `Marker`
   - substituir por uma abordagem compatível com SVG, preservando hover e clique para seleção do destino
   - eliminar o warning do console relacionado ao `MapaDestinosCard`

4. Validar a fonte cartográfica:
   - manter o arquivo atual `public/geo/brasil-uf.json` se o ajuste visual resolver
   - se a malha continuar inadequada, trocar por uma base simplificada/compatível para melhorar a leitura do mapa

## Arquivos envolvidos
- `src/components/passagens/MapaDestinosCard.tsx`
- `public/geo/brasil-uf.json` (somente se for necessário trocar a base cartográfica)

## Validação esperada
- o contorno do Brasil aparece claramente no card
- as bolhas continuam posicionadas corretamente
- clique nos destinos continua filtrando o dashboard
- hover continua exibindo contexto da cidade
- sem warning do tooltip no console