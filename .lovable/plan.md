## Objetivo

Corrigir a seção "OP Complementar — Manter GS" em `src/pages/NumeroSeriePage.tsx` para sempre enviar `origem_op_nova` (padrão `"250"`) junto com `numero_op_nova`, evitando ambiguidade entre OPs de origens diferentes no Senior.

## Mudanças no frontend

Arquivo único: `src/pages/NumeroSeriePage.tsx`.

### 1. Estado novo

Adicionar ao bloco "OP Complementar — Manter GS" (linhas 137–144):

- `const [opcOrigemOpNova, setOpcOrigemOpNova] = useState('250');`

### 2. Renomear rótulos da UI (linhas 623–660)

- "OP nova 250" → **"OP nova"** (placeholder `Ex.: 1113`)
- Novo campo logo após: **"Origem da OP nova"** (Input texto, mono, default `250`, placeholder `250`) — `opcOrigemOpNova` / `setOpcOrigemOpNova`
- "OP origem" → **"OP original"** (placeholder `Ex.: 250`)
- "Origem OP origem" → **"Origem da OP original"** (mantém `opcOrigemOpOrigem`, default `250`)
- "GS original" → mantém rótulo, placeholder `Ex.: GS-11661`
- Descrição do card: trocar "origem 250" por "informe a origem (geralmente 250)" para refletir que a origem agora é parametrizada.

### 3. `executarOpComplementar` (linhas 524–556)

Ajustar validação e payload:

- Validar `opcOrigemOpNova.trim()` obrigatório (toast: "Informe a origem da OP nova.").
- Trocar mensagem da validação de OP nova vazia para "Informe a OP nova.".
- Montar payload na ordem do contrato:

```ts
const body: Record<string, any> = {
  codigo_empresa: 1,
  numero_op_nova: Number(opcOpNova),
  origem_op_nova: (opcOrigemOpNova || '250').trim(),
  ...(opcOpOrigem.trim() ? { numero_op_origem: Number(opcOpOrigem) } : {}),
  origem_op_origem: (opcOrigemOpOrigem || '250').trim(),
  ...(opcNumeroSerie.trim() ? { numero_serie: opcNumeroSerie.trim().toUpperCase() } : {}),
  justificativa: opcJustificativa.trim(),
  confirmar,
};
```

- Tratamento de erro: preservar mensagem completa do backend — usar `e?.message || e?.detail || JSON.stringify(e) || 'Falha na operação.'` no `toast.error`.

### 4. Preenchimento automático

Se houver algum efeito que preenche `opcOpNova` a partir do contexto, garantir que `opcOrigemOpNova` permaneça `'250'` (não sobrescrever). Hoje não há auto-fill desses campos, então basta manter o default `'250'` no `useState`.

## Fora de escopo

- Backend FastAPI (já aceita `origem_op_nova`).
- Outras seções da página (Reservar, Vincular, Desvincular).
- Mudanças de layout/estilo além dos rótulos.

## Validação

- Build TypeScript verde.
- Abrir `/numero-serie`, preencher OP nova `1113`, deixar origem `250`, simular e confirmar que a request em network contém `origem_op_nova: "250"`.
