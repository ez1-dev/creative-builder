## Diagnóstico

O problema não parece estar nos dados.

Confirmei 3 pontos importantes:

1. **Os dados têm variação real por UF**
   - PR: 57
   - PA: 56
   - SP: 53
   - BA: 29
   - CE: 27
   Então o mapa **deveria** mostrar pelo menos 4 intensidades bem diferentes.

2. **O GeoJSON está correto**
   - O arquivo `/public/geo/brasil-uf.json` tem 27 features
   - Cada feature usa `properties.codarea`
   - O mapeamento `codarea -> UF` em `mapaUtils.ts` está coerente

3. **O screenshot mostra um sintoma visual claro**
   - Não são só os estados que estão esverdeados
   - **O retângulo inteiro do SVG/canvas também está com um tom verde/mint**
   - Isso indica um **tint/fundo indevido no layer do mapa**, além da escala de cores atual

## Causa provável

Hoje existem **dois fatores somando o efeito “tudo verde”**:

### A. A primeira faixa da escala já é verde
Em `colorForQtd()`:
- sem registro = cinza
- baixo = verde
- médio = azul
- médio-alto = amarelo
- alto = vermelho

Como vários estados caem na faixa “baixo”, o mapa já tende a ficar mais verde nas áreas com poucos registros.

### B. Existe um problema de renderização visual no SVG
Pelo screenshot, há um **fundo/tint verde no viewport do mapa** que não deveria existir.
Isso “lava” as outras cores e faz até estados que deveriam estar em amarelo/vermelho parecerem próximos do mesmo tom.

## Plano de correção

### 1. Remover o tint/fundo indevido do canvas SVG
- Inspecionar o `ComposableMap` e o wrapper imediato
- Garantir fundo explícito transparente
- Verificar se algum layer está cobrindo o viewport inteiro com fill indevido

### 2. Trocar a escala para uma paleta mais legível
Ajustar `colorForQtd()` para evitar verde como primeira faixa ativa.
Sugestão:
- Sem registros = neutro/cinza
- Baixo = azul claro
- Médio = azul forte
- Médio-alto = âmbar
- Alto = vermelho

Assim o mapa deixa de parecer “lavado” mesmo quando houver muitos estados de baixa incidência.

### 3. Aumentar contraste visual entre categorias
- Bordas um pouco mais visíveis
- Fills menos pastéis
- Garantir que PR/PA/SP apareçam claramente destacados

### 4. Validar com os dados atuais
Checar visualmente se:
- PR / PA / SP aparecem como alta intensidade
- BA / CE como médio-alto
- estados sem registro continuam neutros
- o fundo fora do desenho do Brasil não fica colorido

## Arquivos a ajustar

- `src/components/passagens/MapaDestinosCard.tsx`
- `src/components/passagens/mapaUtils.ts`

## Resultado esperado

Depois da correção, o mapa deve:
- parar de parecer um bloco verde único
- mostrar contraste real entre estados
- manter a legenda coerente com o que aparece na tela
- destacar imediatamente os estados líderes

Se você aprovar, eu sigo com essa correção direta.