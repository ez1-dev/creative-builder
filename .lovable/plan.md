

## Ajustes pontuais — Faturamento Genius

Apenas refinamentos na página existente. Sem alterar endpoints, sem SQL no frontend, sem nomes de tabela/schema usados para montar consulta (apenas como texto informativo permitido pelo enunciado).

### Arquivo afetado
`src/pages/FaturamentoGeniusPage.tsx`

### Mudanças

**1. Atualizar nota técnica do rodapé (linhas 482-485)**  
Substituir o parágrafo atual pelo novo texto:
> *"A revenda vem do campo CD_REV_PEDIDO retornado pelo backend. No ERP Genius, a origem provável é a view USU_VMBRUTANFE, e para produtos a revenda nasce do pedido/item, especialmente E120IPD.USU_REVPED. Serviços/devoluções podem aparecer como OUTROS conforme a origem da view."*

**2. "Atualizar Comercial" — tratar resposta de "não aplicável" como aviso**  
No `atualizarComercial()`:
- Após `await api.post(...)`, capturar o retorno (`const resp = await api.post<any>(...)`).
- Se `resp?.aplicavel === false` **ou** `resp?.message`/`resp?.detail` contiver termos como `não se aplica`, `nao se aplica`, `not applicable`, `indisponível neste ambiente`: exibir `toast.info(mensagem)` (warning, não erro), **não** chamar `consultar(1)` automaticamente, e armazenar a mensagem em novo estado `avisoAtualizacao` que renderiza um `Alert` neutro (sem `variant="destructive"`) acima dos KPIs com título "Atualização comercial não aplicável".
- Caso contrário, manter comportamento atual (`toast.success` + `consultar(1)`).
- Resetar `avisoAtualizacao` em nova consulta bem-sucedida e em `limpar()`.

**3. Tratar erro SQL "objeto inválido" como caso específico**  
Adicionar novo estado `fonteIndisponivel: boolean` e nova constante:
```
MSG_FONTE = 'Fonte de faturamento não localizada no banco. Verifique no backend se o objeto configurado existe, por exemplo dbo.USU_VMBRUTANFE.'
```
No `catch` de `consultar()` e `atualizarComercial()`, **antes** dos demais ramos:
- Detectar erro SQL examinando `err?.message`, `err?.details` e `err?.statusCode`. Considerar match quando a string contiver `42S02`, `Nome de objeto`, `Invalid object name` ou `objeto` + `inválido` (case-insensitive).
- Setar `fonteIndisponivel = true`, `error = MSG_FONTE`, `toast.error(MSG_FONTE)`.
- Renderizar `Alert variant="destructive"` com `AlertTriangle`, título "Fonte de faturamento indisponível" e descrição `MSG_FONTE`, posicionado junto ao banner de `backendIndisponivel`. Resetar em consulta OK e em `limpar()`.

**4. Ordem de prioridade dos banners (de cima para baixo)**  
1. `backendIndisponivel` (404)  
2. `fonteIndisponivel` (erro SQL de objeto)  
3. `avisoAtualizacao` (info)  
4. `error` genérico (mantido como hoje)

### O que NÃO muda
- Endpoints (`GET /api/faturamento-genius-dashboard`, `GET /api/faturamento-genius`, `GET /api/export/faturamento-genius`, `POST /api/faturamento-genius/atualizar`).
- Filtros, paginação, KPIs, tabelas, exportação, Switch "Somente com revenda".
- Página continua consumindo apenas a API; nenhum SQL é montado no frontend; nenhum nome de tabela/schema é usado para construir consulta (somente como texto informativo nas mensagens, conforme solicitado).

### Garantias
- Sem alteração em outras páginas, em `api.ts` ou em qualquer migration.
- Sem dados mockados.
- Tratamento de 401 (`ErpConnectionAlert`) e 404 (banner existente) preservados.

