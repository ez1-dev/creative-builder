
## Corrigir a Auditoria Apontamento Genius no backend novo e eliminar o erro real `[object Object],[object Object]`

### Diagnóstico confirmado
A rota atual `/auditoria-apontamento-genius` já chama o endpoint novo `/api/apontamentos-producao`, mas está enviando **query params com nomes errados** para o backend real.

Hoje a tela monta a busca com:
- `numero_op`
- `origem`
- `codigo_produto`
- `somente_maior_8h`

Mas o backend que está respondendo no preview valida:
- `numorp`
- `codori`
- `codpro`
- `somente_acima_8h`

Resultado atual no preview:
```text
422 Unprocessable Entity
detail:
- query.numorp: Field required
- query.codori: Field required
```

O texto `[object Object],[object Object]` é o efeito colateral disso no frontend: o `api.ts` recebe `detail` como array de objetos do FastAPI e transforma isso em string sem formatar.

### O que ajustar

#### 1) Alinhar a busca da página ao contrato real do backend
**Arquivo:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

Trocar o payload da listagem para usar os nomes corretos do backend novo:
- `numorp: filters.numop`
- `codori: filters.codori`
- `codpro: filters.codpro`
- `operador: filters.operador`
- `status_op: mapStatusOpParaApi(filters.status_op)`
- `somente_discrepancia: filters.somente_discrepancia ? 1 : 0`
- `somente_acima_8h: filters.somente_acima_8h ? 1 : 0`

Remover os aliases errados desta chamada:
- `numero_op`
- `origem`
- `codigo_produto`
- `somente_maior_8h`

#### 2) Garantir envio dos campos obrigatórios que o backend exige mesmo vazios
O backend atual está tratando `numorp` e `codori` como obrigatórios na query. Hoje o helper `api.get()` remove campos vazios, então eles nem chegam na URL.

**Arquivos:**
- `src/lib/api.ts`
- `src/pages/AuditoriaApontamentoGeniusPage.tsx`

Implementar uma forma segura de preservar chaves vazias **apenas nessa integração**, sem mudar o comportamento de todas as outras telas. Exemplo de abordagem:
- adicionar opção no `api.get()` para manter algumas chaves vazias, ou
- montar a query desta página com helper local específico.

Aplicar isso para pelo menos:
- `numorp`
- `codori`

Objetivo: a URL da auditoria sempre sair com esses campos presentes, porque o backend atual valida presença e não apenas valor.

#### 3) Corrigir a exportação da mesma tela para o mesmo contrato
**Arquivo:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`
**Possível apoio em:** `src/components/erp/ExportButton.tsx`

O `ExportButton` dessa tela também está montando params com nomes errados. Ajustar `exportParams` para usar o mesmo builder da busca:
- `numorp`
- `codori`
- `codpro`
- `operador`
- `status_op`
- `somente_discrepancia`
- `somente_acima_8h`

Também preservar `numorp` e `codori` na exportação, para não reproduzir o mesmo 422 em `/api/export/apontamentos-producao`.

#### 4) Formatar corretamente erros estruturados do backend
**Arquivo:** `src/lib/api.ts`

Quando o backend devolver:
```json
{
  "detail": [
    { "loc": ["query","numorp"], "msg": "Field required" },
    { "loc": ["query","codori"], "msg": "Field required" }
  ]
}
```

formatar isso para mensagem legível, por exemplo:
```text
numorp: Field required; codori: Field required
```

Assim o frontend para de mostrar `[object Object],[object Object]` quando houver erro real de validação.

### O que não muda
- A rota da SPA continua `/auditoria-apontamento-genius`.
- A grid continua usando o contrato novo de colunas já preparado (`status_movimento`, `horas_realizadas`, `data_movimento`, `hora_movimento`, `data_inicio`, `hora_inicio`, `nome_operador`, `numcad`).
- Não adicionar fallback dizendo que “o backend não existe”.

### Validação
1. Abrir `/auditoria-apontamento-genius`.
2. Fazer consulta sem preencher OP e com/sem origem.
3. Confirmar no network que a requisição sai para:
   - `/api/apontamentos-producao?...&numorp=...&codori=...`
4. Confirmar que não há mais 422 por falta de `numorp`/`codori`.
5. Confirmar que a tabela carrega com o endpoint novo.
6. Testar **Exportar Excel** e verificar que `/api/export/apontamentos-producao` recebe os mesmos params corretos.
7. Se o backend ainda devolver erro, a mensagem exibida deve ficar legível e nunca mais como `[object Object],[object Object]`.

### Resultado esperado
A aba **Auditoria Apontamento Genius** fica de fato integrada ao backend novo já implementado, usando os nomes de parâmetros que o backend real exige, e o erro visível `[object Object],[object Object]` desaparece porque o 422 deixa de ser provocado — e, se houver outra validação real, ela passa a ser mostrada em texto legível.
