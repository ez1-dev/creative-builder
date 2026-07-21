# Validação do payload do drill do Razão — resultado

## O que foi verificado

Chamei `GET /api/contabil/drill-lancamentos` diretamente contra `https://api-erp-renato.ngrok.app` em várias combinações (contas 2160, 777, 2232, 10, 100, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000 × Jan–Abr/2026), cobrindo lançamentos com `origem_codigo` **VEN**, **REC** e **MAN**.

## O que o backend está enviando

Os campos existem separados no schema:

- `usuario` — string
- `usuario_origem` — string | null
- `usuario_lancamento` — string
- `usuario_origem_difere` — boolean

Exemplo real (conta 2160, lote 12932, origem VEN):

```json
{
  "origem_codigo": "VEN",
  "usuario": "agendador",
  "usuario_origem": null,
  "usuario_lancamento": "agendador",
  "usuario_origem_difere": false
}
```

## Conclusão

**Os campos vêm em posições separadas, porém `usuario_origem` está sempre `null`** em toda a amostra — inclusive nos lançamentos de origem **MAN** (Manual/Contabilidade), onde justamente deveria vir preenchido com quem digitou no subsistema/módulo de origem. Consequência: `usuario_origem_difere` também nunca fica `true`, então o realce âmbar nunca dispara em produção.

A separação lógica no front (Usuário Origem estrito × Usuário Lcto. com fallback) está correta e continua necessária — o problema é upstream: o backend não está resolvendo o `usuario_origem` a partir do subsistema/lote de origem.

## Plano de ação

### 1. Reportar ao backend (bloqueante para a feature ter valor)

Abrir demanda no FastAPI (`/api/contabil/drill-lancamentos`) para popular `usuario_origem` conforme o `origem_codigo`:

| Origem | Fonte esperada de `usuario_origem` |
|---|---|
| VEN | usuário que emitiu a NF no faturamento |
| REC | usuário que lançou o recebimento |
| EST | usuário do movimento de estoque |
| MAN | usuário que criou o lançamento manual no módulo contábil |
| PAT | usuário da baixa/movimento patrimonial |

E recalcular `usuario_origem_difere = (usuario_origem is not null and usuario_lancamento is not null and usuario_origem != usuario_lancamento)`.

### 2. Ajuste no front (opcional, cosmético)

No `src/components/dre-studio/DrillDrawer.tsx`, quando `usuario_origem` vier `null`, exibir "—" (já é o comportamento atual) e adicionar um tooltip discreto no cabeçalho da coluna:

> "Preenchido quando o ERP identifica o usuário do subsistema de origem. Vazio para lançamentos automáticos (integração/agendador)."

Isso reduz confusão do usuário enquanto o backend não popula o campo. Nenhuma outra mudança de código é necessária — a separação já está correta.

## Detalhes técnicos

- Endpoint testado: `GET /api/contabil/drill-lancamentos?codemp=1&codfil=1&ctared={conta}&anomes_ini={am}&anomes_fim={am}` com header `ngrok-skip-browser-warning: true`.
- Amostra: ~14 contas × 4 competências, cobrindo VEN/REC/MAN. Zero linhas com `usuario_origem` preenchido.
- Frontend atual (após a última correção) já usa `usuarioOrigemValue` estrito e `usuarioLancamentoValue` com fallback — nenhuma regressão detectada.

## Fora de escopo

Não vou alterar a lógica de fallback do front para "chutar" um `usuario_origem` a partir de `usuario` — isso reintroduziria o bug de "os dois campos ficam iguais" que acabamos de corrigir.
