## Objetivo
Fazer a sincronização ERP → Fila funcionar novamente no módulo **Programação e Sequenciamento**, garantindo que a função chame a FastAPI com a URL correta e que erros de configuração de secret apareçam de forma clara.

## O que vou implementar
1. **Corrigir a configuração de secrets com formulário seguro**
   - Abrir a atualização segura de `FASTAPI_BASE_URL` para você informar a URL pública correta da FastAPI.
   - Confirmar que `CRON_SECRET` permanece separado e não é usado como URL.

2. **Endurecer a validação na Edge Function `programacao-sync-fila`**
   - Validar que `FASTAPI_BASE_URL`:
     - começa com `http://` ou `https://`
     - não contém `localhost`
     - não contém `127.0.0.1`
     - não termina com `/`
     - não é igual ao valor de `CRON_SECRET`
   - Retornar erro amigável e persistir o diagnóstico quando a configuração estiver inválida.

3. **Garantir a montagem correta da chamada para a FastAPI**
   - Usar a URL esperada:
     `.../api/producao/programacao/fila-erp?codemp=1&situacoes=A%2CL&limite=5000`
   - Confirmar que a função não envia `data_ini` e `data_fim` na sincronização padrão.
   - Confirmar o envio de `x-cron-secret` apenas no header.

4. **Verificar interface e diagnóstico**
   - Manter a exibição do erro da função na interface.
   - Confirmar o card de diagnóstico com:
     - última sincronização
     - quantidade recebida da FastAPI
     - quantidade gravada em `bi_ops_fila`
     - total atual de linhas em `bi_ops_fila`
     - último erro
     - URL chamada, sem expor secrets
   - Manter a mensagem de fila vazia quando `bi_ops_fila` estiver sem registros.

5. **Deploy e teste ponta a ponta**
   - Atualizar/republicar a Edge Function se houver diferença entre código local e implantado.
   - Testar o botão **Atualizar fila do ERP**.
   - Validar se `bi_ops_fila` foi populada e se o diagnóstico mostra sucesso.

## Detalhes técnicos
- O código local já está montando `limite`, não `limit`; como o erro mostrado ainda cita `limit=5000`, vou confirmar se a função implantada está desatualizada e republicá-la.
- O backend hospedado está saudável; o bloqueio atual é de configuração da URL base e validação da chamada.
- Não vou alterar o algoritmo de programação, regras de agenda, capacidades ou a FastAPI externa.