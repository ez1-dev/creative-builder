Plano para corrigir o drill de lançamentos ao clicar nos valores da DRE/Balanço:

1. Ajustar o contexto enviado no clique da grid
   - Ao clicar em um valor, manter `modeloId` e `linhaId` no payload da gaveta de lançamentos.
   - Enviar também período, empresa, filial, centro de custo e, quando existir, `ctared`/`clacta` como filtros adicionais.

2. Corrigir a chamada do endpoint `/api/contabil/drill-lancamentos`
   - Hoje a requisição observada saiu apenas com `ctared/codccu/anomes`, sem `modelo_id` e `linha_id`.
   - Vou ajustar o hook usado pela gaveta para incluir `modelo_id` e `linha_id`, permitindo que o backend resolva corretamente as contas vinculadas à linha da DRE/Balanço.

3. Remover o bloqueio indevido de “selecione uma conta”
   - A gaveta não deve depender exclusivamente de `ctared` quando já existe `linhaId/modeloId`.
   - Ela deve consultar o razão por linha/modelo e só mostrar aviso se realmente não houver contexto suficiente.

4. Preservar as melhorias já feitas
   - Manter as colunas “Usuário Origem” e “Usuário Lcto.”.
   - Manter destaque quando `usuario_origem_difere === true`.
   - Manter os rótulos oficiais de origem, incluindo `MAN = Manual (contabilidade)`.

5. Validar no preview
   - Clicar em uma célula de valor da grid.
   - Confirmar que a requisição passa `modelo_id` e `linha_id`.
   - Confirmar que a gaveta lista os lançamentos retornados ou, se o backend retornar vazio, mostra o vazio real com os filtros corretos.