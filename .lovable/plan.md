## Problema
A lista "Contas disponíveis do ERP" no Montador hoje envia `limite=250` por padrão pro endpoint `/plano-contas`, então mesmo que o ERP tenha milhares de contas ativas, só as 250 primeiras (por `valor DESC`) chegam.

## Ajuste (somente frontend + doc)

### 1. `src/pages/bi/contabilidade/DreMontadorPage.tsx`
- Trocar o estado `limite` para aceitar `'all'` além dos valores numéricos.
- Default passa a ser `'all'`.
- Adicionar opção **"Todas"** no `<Select>` de limite (mantendo 50/100/250/500/1000 como atalhos).
- Quando `limite === 'all'`, **não enviar** `limite` no payload para `fetchPlanoContasDinamica` (backend então devolve todas).
- Adicionar no cabeçalho do card um contador: `Mostrando N contas` (já existe `de {contasOrdenadas.length}`).

### 2. `src/lib/bi/dreMontadorApi.ts`
- `PlanoContasParams.limite` continua opcional; já omite `limite` da querystring quando não passado — nada a mudar de fato, só confirmar.

### 3. `docs/backend-bi-contabilidade-dre-dinamica-montador.md`
- Atualizar a linha do query param `limite`: "Default 250. **Quando omitido, retornar todas as contas ativas do período** (sem cap). Recomenda-se cap interno de segurança em ~10.000."

## Fora de escopo
- Paginação/virtualização da tabela (se ficar lento com muitas linhas, abrimos outro ticket).
- Mudanças no endpoint `/dre-dinamica` ou no payload de vínculo.