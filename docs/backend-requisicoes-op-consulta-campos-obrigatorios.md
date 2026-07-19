# Requisições — Consulta de OP: campos obrigatórios por componente

Endpoint: `GET /api/requisicoes/op/{codori}/{numorp}`

O front chama esse endpoint para popular o Step 2 de "Nova requisição — com OP" e depois envia o payload para `POST /api/requisicoes`. O validador do FastAPI descarta itens que cheguem sem chaves de estágio/estoque, resultando na mensagem genérica **"Informe ao menos um item válido"** — mesmo quando o usuário selecionou linhas na tela.

Para que a criação de requisição funcione, cada objeto em `componentes[]` PRECISA vir com estes campos preenchidos (não `null`, não `""`):

| Campo        | Origem esperada (Senior)                | Uso no POST                 |
| ------------ | --------------------------------------- | --------------------------- |
| `codemp`     | e610est / e660orp                       | `itens[].codemp`            |
| `codfil`     | e610est / e660orp                       | `itens[].codfil`            |
| `codori`     | e660orp                                 | `itens[].codori`            |
| `numorp`     | e660orp                                 | `itens[].numorp`            |
| `codetg`     | e615etp (estágio do componente)         | `itens[].codetg`            |
| `seqcmp`     | e610est.SeqCmp                          | `itens[].seq` / `seqcmp`    |
| `codcmp`     | e610est.CodCmp                          | `itens[].codcmp`            |
| `codder`     | e610est.CodDer (pode ser null real)     | `itens[].codder`            |
| `unidade`    | e075pro.UniMed do componente            | `itens[].unidade`           |
| `deposito`   | e610est.CodDep (depósito de origem)     | `itens[].deposito_origem`   |

Campos opcionais que só afetam UX (podem vir `null` sem quebrar o POST): `descricao`, `saldo_fisico`, `codfam`, quantidades acessórias.

## Sintoma quando algum campo obrigatório vem null

1. O componente aparece no Step 2, mas o front agora desabilita o checkbox com tooltip *"Componente incompleto (campo X ausente)"*.
2. Se já estava selecionado, o Step 4 mostra badge vermelho **"Dados incompletos"** e bloqueia `Salvar rascunho` / `Enviar requisição`.
3. Se o gate do front for burlado, o backend responde 4xx com `detail: "Informe ao menos um item válido"` (porque filtra itens sem `codcmp`/`codetg`).

## Caso conhecido

- OP `110/1969`, componente `BR125-G`: consulta vem com `descricao=null` e `deposito=null`. Corrigir o JOIN do endpoint com `e075pro` e `e610est.CodDep` para essa origem/filial.

## Contrato mínimo esperado (exemplo)

```json
{
  "op": { "codemp": 1, "codfil": 1, "codori": "110", "numorp": "1969", "sitorp": "A", "pode_requisitar": true, "motivo_bloqueio": null, "..." : "..." },
  "componentes": [
    {
      "seqcmp": 10,
      "codetg": 10,
      "codcmp": "BR125-G",
      "codder": null,
      "descricao": "BARRA CHATA 125 GALVANIZADA",
      "unidade": "PC",
      "deposito": 1,
      "quantidade_prevista": 4,
      "quantidade_utilizada": 0,
      "quantidade_requisitada": 0,
      "quantidade_transferida": 0,
      "quantidade_disponivel": 0,
      "saldo_fisico": 0
    }
  ]
}
```
