Vou corrigir o problema no frontend do mapa em `/passagens-aereas`.

## O que eu confirmei
- Os dados no backend estão corretos: a consulta atual mostra vários estados com volume relevante (`PR 57`, `PA 56`, `SP 53`, `BA 29`, `CE 27` etc.).
- A própria UI já confirma isso parcialmente: o título mostra `Paraná (57)` e o `Top 5 destinos` está coerente.
- Portanto, o problema não está no carregamento dos dados nem no `uf_destino`; ele está na renderização do SVG em `src/components/passagens/MapaDestinosCard.tsx`.

## Causa raiz provável
Há dois problemas visuais no componente do mapa:

1. **As cores por intensidade não estão sendo aplicadas no estado “default” do `Geography`**
   - Hoje o componente calcula `fill` corretamente, mas a cor dinâmica está sendo passada de forma que a biblioteca não está refletindo isso como esperado no desenho base.
   - Resultado prático: quase todos os estados ficam com uma cor parecida, mesmo com contagens bem diferentes.

2. **As siglas das UFs estão sendo posicionadas com coordenadas geográficas brutas**
   - O código usa `geoCentroid(geo)` diretamente como `x/y` do SVG.
   - Isso explica o agrupamento das siglas no canto superior esquerdo da imagem.
   - O centróide precisa ser projetado para coordenadas do mapa antes de renderizar o texto.

## Plano de implementação
1. **Corrigir a pintura dos estados** em `MapaDestinosCard.tsx`
   - Aplicar a cor calculada explicitamente dentro de `style.default.fill`, `style.hover.fill` e `style.pressed.fill`.
   - Manter stroke e hover consistentes.
   - Garantir que cada UF use de fato o `qtd` vindo de `porUF`.

2. **Corrigir o posicionamento das siglas**
   - Substituir o uso direto de `geoCentroid` como coordenada SVG por uma abordagem projetada.
   - Posso fazer isso de duas formas seguras, seguindo o que encaixar melhor na biblioteca já usada:
     - usar `Marker`/projeção do `react-simple-maps`, ou
     - projetar o centróide antes de desenhar o `<text>`.
   - Isso vai espalhar as siglas corretamente sobre os estados.

3. **Adicionar um fallback de identificação da UF mais robusto**
   - Hoje o mapa depende de `geo.properties.codarea`.
   - Vou manter isso, mas adicionar fallback defensivo caso alguma feature venha com outra chave compatível no GeoJSON.
   - Isso reduz risco de inconsistência futura no arquivo `public/geo/brasil-uf.json`.

4. **Validar visualmente o resultado**
   - Confirmar que estados com maior incidência (`PR`, `PA`, `SP`) ficam visualmente destacados.
   - Confirmar que estados médios (`BA`, `CE`, `AM`) aparecem em faixas diferentes.
   - Confirmar que as siglas não ficam mais empilhadas no canto.

## Arquivo principal a ajustar
- `src/components/passagens/MapaDestinosCard.tsx`

## Resultado esperado
- O mapa passará a refletir os dados reais já carregados.
- As cores vão variar por intensidade de forma visível.
- As siglas das UFs ficarão posicionadas corretamente.
- Não será necessário mexer no banco para esse ajuste específico.

Se você aprovar, eu implemento essa correção agora.