## Objetivo

Adicionar um quarto modo de arredondamento global do BI: **"Milhões (MI)"**, que força todos os valores monetários e numéricos a serem exibidos em milhões com 3 casas decimais (ex.: `378.245` → `R$ 0,378 mi`, `1.400.000` → `R$ 1,400 mi`).

O modo é opcional — o usuário escolhe no toggle existente, junto com Completo / Sem decimais / Abreviado.

## Mudanças

### 1. `src/lib/bi/numberFormatMode.ts`
- Adicionar `'millions'` ao tipo `NumberRoundingMode`.
- `NUMBER_ROUNDING_LABEL.millions = 'Milhões (MI)'`.
- `NUMBER_ROUNDING_DESC.millions = 'R$ 0,378 mi'`.

### 2. `src/components/bi/utils/formatters.ts`
- Criar helper interno `formatMillions(value, currency)` → divide por 1.000.000 e formata com 3 casas decimais pt-BR; sufixo ` mi`, prefixo `R$ ` se `currency`.
- Em `formatCurrency`: se `mode === 'millions'` → `formatMillions(v, true)`.
- Em `formatNumber`: se `mode === 'millions'` → `formatMillions(v, false)`.
- Em `formatQuantity`: se `mode === 'millions'` → mesma escala (suffix preservado).
- `formatPercent` continua intocado (regra existente).

### 3. Eixos / ticks dos gráficos
- `src/components/bi/utils/chartHelpers.ts`: `tickCurrencyAbbrev` hoje sempre abrevia. Tornar consciente do modo: quando `millions`, retornar `R$ X,XXX mi` (3 casas). Demais modos: comportamento atual preservado.

### 4. Toggle UI
- `src/components/bi/runtime/NumberRoundingToggle.tsx`: nenhum hardcode — itera sobre `NUMBER_ROUNDING_LABEL`, então o novo modo aparece automaticamente. Verificar e confirmar.

### 5. Persistência da preferência
- `src/hooks/useBiDisplayPrefs.ts`: já salva strings genéricas; basta validar que `'millions'` é aceito (sem allowlist restritiva). Ajustar se houver enum guard.

## Fora de escopo

- Backend / API / contratos de drill.
- Tabelas e drills do BI (continuam respeitando o modo global como hoje — vão herdar automaticamente via `formatCurrency`).
- Formatadores de `src/lib/format.ts` (legacy, fora da biblioteca BI).
- `formatPercent` continua sem modo.

## Validação

1. Ir em `/bi/comercial`, selecionar "Milhões (MI)" no toggle.
2. KPIs mostram `R$ 0,378 mi` em vez de `R$ 378.245`.
3. Gráfico "Faturamento mensal x Meta": eixo Y em `R$ 0,500 mi`, `R$ 1,000 mi`; tooltip e labels coerentes.
4. Treemap "Faturamento Estado": rótulos em `mi`.
5. Trocar para "Completo" / "Abreviado" / "Sem decimais" — comportamento anterior preservado.
6. Sem erros de console; preferência persiste após reload.
