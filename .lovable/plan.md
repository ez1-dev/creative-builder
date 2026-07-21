## Plano de correção — Drill de lançamentos DRE/Balanço

### Diagnóstico confirmado
- O clique está chamando `/api/contabil/drill-lancamentos` corretamente, com `modelo_id`, `linha_id`, `ctared`, `codemp`, `codfil` e período.
- O retorno do backend está vindo `200`, mas com `qtd_total: 0`.
- O request atual está enviando também `codccu=49171` / `centro_custo=49171`; pelos exemplos enviados, a conta 2160 em janeiro traz lançamentos quando não fica presa a esse filtro de centro de custo.

### Ajustes que vou fazer
1. **Não restringir o Razão por centro de custo por padrão**
   - No clique da grid da DRE/Balanço, remover o envio automático de `codccu` para o endpoint de lançamentos.
   - Manter empresa, filial, período, `modelo_id`, `linha_id`, `ctared`/`clacta`.

2. **Preservar opção técnica para centro de custo quando necessário**
   - Não remover suporte do hook; apenas evitar que a visualização principal filtre o razão por centro de custo quando o usuário clica no valor da grid.
   - Assim o backend pode retornar os lançamentos consolidados da conta/linha, como no exemplo com 26 lançamentos.

3. **Melhorar fallback do frontend**
   - Garantir que o drawer leia resultados de `itens`, `dados`, `rows` ou `lancamentos`, caso o backend varie o nome do array.
   - Manter os totais do cabeçalho vindos do backend.

4. **Validar no preview**
   - Repetir o clique na conta 2160/2232 e conferir a URL gerada.
   - Confirmar visualmente que o drawer passa a listar os lançamentos quando o backend retornar registros.

### Resultado esperado
Ao clicar nos valores da DRE/Balanço, o Razão deve abrir com os lançamentos do período, igual ao exemplo enviado, sem ficar zerado por causa de filtro indevido de centro de custo.