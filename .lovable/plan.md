
## Status: aguardando backend

A mensagem que você está vendo é o **comportamento correto** implementado na última iteração — não é um bug. A tela detectou o HTTP 404 do ERP em `GET /api/estoque/movimentacao` e mostrou o aviso para evitar a enxurrada de toasts "Not Found".

### O que está acontecendo (confirmado pelos logs de rede)
```
GET https://flakily-wanning-faye.ngrok-free.dev/api/estoque/movimentacao
→ 404 {"detail":"Not Found"}
```
Login no ERP funciona (200), token JWT é válido, usuário `RENATO` autenticado. O único problema: os 3 endpoints novos **não existem ainda** no FastAPI.

### O que falta para a tela funcionar
Implementar no backend FastAPI (fora deste repo) os 3 endpoints conforme `docs/backend-sugestao-minmax.md`:

| Endpoint | Método | Função |
|---|---|---|
| `/api/estoque/movimentacao` | GET | Lista movimentação histórica (E210MVP + E210DLS) |
| `/api/estoque/sugestao-politica` | GET | Calcula min/máx por fórmula |
| `/api/estoque/politica/salvar` | POST | MERGE em `USU_EST_POLITICA` |

E criar a tabela `USU_EST_POLITICA` (SQL completo no doc).

### Como prosseguir — escolha uma opção

**Opção A — Aguardar o backend**
Nada a fazer no frontend. Assim que os endpoints subirem, a tela funciona automaticamente (banner some na primeira resposta 200).

**Opção B — Modo demo/mock no frontend**
Adicionar um toggle "Usar dados de exemplo" na tela `/sugestao-min-max` que:
- Gera ~30 linhas fictícias de movimentação (produtos, depósitos, datas, quantidades plausíveis).
- Permite testar **Gerar sugestão** (cálculo local com as fórmulas do doc) e **Sugerir com IA** (edge function `sugestao-minmax-ia` já está pronta e roda 100% sem o backend ERP).
- **Salvar política** fica desabilitado (precisa do POST real no ERP).
- Útil para validar UX, fluxo IA e demonstrar para stakeholders enquanto o backend é implementado.

**Opção C — Cálculo 100% no frontend usando outro endpoint já existente**
Se algum endpoint atual do ERP já devolve movimentação por produto (ex.: algo equivalente em `/api/estoque/...` que esteja publicado), podemos apontar a tela para ele e fazer o agrupamento/cálculo no cliente. Requer você confirmar qual endpoint existe hoje.

**Opção D — Documentação para o time de backend**
Gerar um arquivo `docs/backend-sugestao-minmax-checklist.md` resumido (1 página, em formato de checklist com SQL pronto, exemplos de request/response em JSON e curl) para acelerar a implementação no FastAPI.

### Recomendação
**Opção B + Opção D** em paralelo: você desbloqueia a demonstração da tela (incluindo o fluxo IA, que é o diferencial) e entrega ao backend um checklist enxuto para implementar os 3 endpoints rapidamente.

Me diga qual opção (A, B, C, D ou combinação) você prefere e eu sigo.
