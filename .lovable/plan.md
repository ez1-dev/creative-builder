
A request foi enviada com `centro_custo=663` e retornou 200 OK, mas o JSON de resposta **não contém** os campos `centro_custo` nem `projeto` nos registros — só vem `codigo_empresa`, `codigo_filial`, `tipo_titulo`, `numero_titulo`, `codigo_fornecedor`, `nome_fornecedor`, `fantasia_fornecedor`, datas, valores e status.

Ou seja:
- O frontend envia o filtro corretamente.
- O backend aceita o parâmetro (não dá erro), mas **não está retornando as colunas `centro_custo` e `projeto` no SELECT do endpoint `/api/contas-pagar`** (provavelmente também `/api/contas-receber`).
- Por isso a grid mostra "-" nessas colunas: o `render: (v) => v || '-'` recebe `undefined`.

Adicionalmente, não dá para confirmar se o `WHERE centro_custo = 663` está sendo aplicado no SQL — o total retornado (`221.004` registros) é igual ao total geral, sugerindo que **o filtro também não está sendo aplicado no backend**.

## Diagnóstico

| Item | Status |
|---|---|
| Frontend envia `centro_custo` / `projeto` | ✅ Confirmado na URL |
| Backend retorna campos na resposta | ❌ Ausentes no JSON |
| Backend filtra por esses campos no SQL | ❌ Provável que não (total = total geral) |

## Causa raiz

O endpoint FastAPI `/api/contas-pagar` (e `/api/contas-receber`) precisa ser ajustado no **backend** para:

1. Adicionar `cod_ccu` (centro de custo) e `cod_prj` (projeto) ao `SELECT` da query SQL.
2. Mapear esses campos no response como `centro_custo` e `projeto`.
3. Adicionar cláusulas `WHERE` opcionais quando os parâmetros forem informados.

Como o backend FastAPI **não está neste repositório do Lovable**, não posso alterar o SQL daqui.

## O que posso fazer no frontend

Nada resolve sozinho — sem o campo na resposta, a coluna ficará vazia. Mas posso:

1. **Confirmar visualmente o problema** adicionando um aviso na UI quando `centro_custo`/`projeto` forem filtrados mas vierem vazios.
2. **Documentar o contrato esperado** num arquivo `docs/api-contracts.md` para o time backend implementar.

## Plano sugerido

**Opção A — Documentar contrato para backend (recomendado)**
Criar `docs/backend-contas-centro-custo-projeto.md` descrevendo:
- Endpoints afetados: `/api/contas-pagar`, `/api/contas-receber`, `/api/export/contas-pagar`, `/api/export/contas-receber`
- Parâmetros de query a aceitar: `centro_custo` (string), `projeto` (string)
- Campos a incluir na resposta de cada item: `centro_custo`, `projeto`
- Tabelas Senior prováveis: `E550CCU` (centros de custo) e `E085PRJ` (projetos), via joins com `E550MOV`/`E550NFC`

**Opção B — Sem ação no frontend**
Apenas comunicar ao time de backend o que precisa ser ajustado.

Recomendo a **Opção A** para deixar o contrato registrado no projeto.
