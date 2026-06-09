## Bugs no drill "Detalhes de Impostos"

Dois ajustes pontuais em `src/components/bi/drill/ComercialDrillDrawer.tsx`. Sem mudanças de backend/API.

### 1. Coluna "Ano/Mês" exibindo "R$ 202.605"

Causa: a coluna `anomes_emissao` está sendo formatada como moeda (provável `format: 'currency'` vindo do backend ou casamento equivocado em `inferFormat`). Valor `202605` no modo "sem decimais" vira `R$ 202.605`.

Correção: tratar chaves de período/data como **texto puro**, ignorando qualquer `format` numérico. Em `inferFormat` (e/ou no render), forçar `raw` para chaves que casem com:

- `anomes_emissao`, `anomes`, `ano_mes`, `periodo`, `mes_ref`, `competencia`
- sufixos/prefixos: `dt_`, `data_`, `_data`, `_dt`

Exibição: formatar `anomes_emissao` como `YYYY/MM` (ex.: `2026/05`) para leitura.

### 2. Código do cliente duplicado ("8865" e "8865 - PAULO...")

Causa: backend devolve `cd_cliente` (código) **e** `nm_cliente` já contendo `cliente_label` (`"8865 - PAULO CESAR..."`). Aparece o código duas vezes.

Correção no render de `nm_cliente` (linha 218): se o valor começa com `"{cd_cliente} - "`, remover esse prefixo e exibir só o nome. Mesma regra aplicada para `ds_produto`, `nm_revenda`, `ds_obra` (defensivo, mesmo padrão de label do backend).

### Fora de escopo

- Backend / contrato de colunas.
- Outras telas do BI Comercial.
- Lógica de ordenação (mantida como está).

### Validação

Abrir `/bi/comercial`, drill até "Detalhes Impostos" de uma NF:
- "Ano/Mês" mostra `2026/05` (não `R$ ...`).
- Coluna "Cliente" mostra `8865`; "Nome Cliente" mostra `PAULO CESAR MASSARO THIBES CORDEIRO` (sem o código repetido).
- Demais drills (CLIENTE, REVENDA, PRODUTO) continuam exibindo nomes normalmente.
