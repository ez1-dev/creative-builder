

# Corrigir exibição de localização no cabeçalho

## Problema
O fuso `America/Sao_Paulo` cobre SP, SC, PR, RS, MG, RJ, ES, GO, DF e outros estados. Por isso, quem está em Campos Novos (SC) vê "São Paulo, BR".

## Opções

### Opção A — Usar Geolocalização real (API do navegador)
- Chamar `navigator.geolocation.getCurrentPosition()` para obter lat/lon
- Usar uma API gratuita de geocoding reverso (ex: BigDataCloud, que não precisa de chave) para converter em cidade/estado
- **Prós**: mostra a cidade correta (ex: "Campos Novos, SC")
- **Contras**: pede permissão ao usuário; pode ser negada; depende de API externa

### Opção B — Remover localização ou mostrar apenas o fuso
- Trocar "São Paulo, BR" por "Fuso: BRT (UTC−3)" ou simplesmente remover o campo
- **Prós**: sem dependência externa, sem permissão
- **Contras**: menos informativo

## Recomendação
**Opção A** com fallback: tentar geolocalização → se negada ou falhar, mostrar o fuso horário como fallback.

## Implementação — `src/components/HeaderInfo.tsx`

1. No `useEffect`, chamar `navigator.geolocation.getCurrentPosition`
2. Com as coordenadas, fazer fetch para `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=X&longitude=Y&localityLanguage=pt`
3. Extrair `city` e `principalSubdivisionCode` da resposta (ex: "Campos Novos, SC")
4. Armazenar no state `location`; se falhar, manter o fallback atual baseado no fuso horário
5. Adicionar estado de loading para evitar flash de "São Paulo" antes da resposta real

### Arquivo afetado
- `src/components/HeaderInfo.tsx`

