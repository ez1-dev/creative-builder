# Card "OP Complementar — Manter GS"

Adicionar um novo card na página `src/pages/NumeroSeriePage.tsx`, posicionado logo abaixo do card principal de filtros. A funcionalidade prepara uma OP complementar origem 250 para herdar o mesmo GS da OP/máquina original antes da finalização.

## 1. Edição em `src/pages/NumeroSeriePage.tsx`

### Estado local (novo bloco no componente)
- `opNova: string` (obrigatório)
- `opOrigem: string` (opcional)
- `origemOpOrigem: string` (default `"250"`)
- `numeroSerieOriginal: string` (opcional)
- `justificativa: string` (obrigatório, mín. 20 chars)
- `loadingComplementar: 'simular' | 'manter' | null`
- `resultadoComplementar: ResultadoComplementar | null`

### Tipagem do resultado
```ts
interface ResultadoComplementar {
  numero_serie?: string;
  numero_op_nova?: number | string;
  codigo_produto?: string;
  derivacao?: string;
  numero_pedido?: number;
  item_pedido?: number;
  situacao_op?: string;
  conflito?: string | null;
  mensagem?: string;
}
```

### Validação
- `opNova` não pode ser vazio.
- `justificativa.trim().length >= 20`.
- Em falha exibir `toast.error(...)` e abortar a chamada.

### Funções
- `handleSimular()` → `POST /api/numero-serie/op-complementar/simular` com `confirmar: false`.
- `handleManterGs()` → `POST /api/numero-serie/op-complementar/manter-gs` com `confirmar: true`. Em sucesso, exibe `toast.success` e mantém o resultado visível.
- Ambas usam `api.post(...)` do client `@/lib/api`, setam `loadingComplementar` e populam `resultadoComplementar`. Erros tratados via `toast.error(err?.message || 'Falha...')`.

### Payload (idêntico para ambos endpoints, mudando apenas `confirmar`)
```ts
{
  codigo_empresa: 1,
  numero_op_nova: Number(opNova),
  numero_op_origem: opOrigem ? Number(opOrigem) : undefined,
  origem_op_origem: origemOpOrigem || '250',
  numero_serie: numeroSerieOriginal || undefined,
  confirmar: false | true,
  justificativa,
}
```

### JSX do card (inserido logo após o card principal de filtros)
```text
Card
├─ CardHeader
│   └─ CardTitle: "OP Complementar — Manter GS"
│       (com ícone Link2 e legenda curta)
└─ CardContent (grid 2 col em md)
    ├─ Label/Input "OP nova 250" *           (opNova)
    ├─ Label/Input "OP origem"               (opOrigem)
    ├─ Label/Input "Origem OP origem" (250)  (origemOpOrigem)
    ├─ Label/Input "GS original"             (numeroSerieOriginal)
    ├─ Label/Textarea "Justificativa" *      (justificativa, min 20)
    ├─ Linha de botões:
    │   ├─ Button variant="outline" onClick={handleSimular}  → "Simular"
    │   └─ Button onClick={handleManterGs}                  → "Manter GS na nova OP"
    └─ Bloco de resultado (quando resultadoComplementar):
        Alert + grid de Badge/Labels com:
          GS encontrado, OP nova, Produto, Derivação,
          Pedido, Item, Situação da OP,
          e Alert destructive com "Conflito" se existir.
```

Estilo segue o padrão atual da página (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Input`, `Label`, `Button`, `Alert`, `Badge`). Sem nova rota, sem novos arquivos.

## Fora do escopo
- Nenhuma mudança de roteamento, backend, ou em outros cards.
- Sem mexer no fluxo existente de contexto/reserva/desvínculo.
- Documentação backend já existe; não será alterada.
