

## Corrigir tipos de `numorp` (e `codori`) para o contrato novo do backend

### Diagnóstico
O backend agora valida:
```
numorp: Input should be a valid integer, unable to parse string as an integer
```

Ou seja: `numorp` mudou de obrigatório-string para **inteiro opcional**. Hoje a página envia `numorp=""` (string vazia) sempre, por causa do `AUDITORIA_KEEP_EMPTY`. O backend tenta converter `""` para int e quebra com 422.

`codori` provavelmente seguiu o mesmo caminho (campo numérico do ERP). Vou tratar os dois com a mesma regra.

### O que muda

**Arquivo:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. Em `buildAuditoriaListParams`:
   - `numorp`: enviar `Number(filters.numop)` quando `filters.numop` for string não-vazia e numérica; caso contrário, **omitir** (`undefined`) — não mandar string vazia.
   - `codori`: mesma regra — enviar como número se numérico, senão omitir.
2. Remover `AUDITORIA_KEEP_EMPTY` da chamada `api.get(...)` e do `<ExportButton ... keepEmptyKeys={...}/>`. Esses campos agora são opcionais no backend; não precisam mais aparecer vazios na URL.
3. Manter `AUDITORIA_KEEP_EMPTY` exportado como `[] as const` (ou removê-lo) — decidir pela remoção é mais limpo, mas quebra os testes existentes; vou **mantê-lo exportado como array vazio** para não quebrar import nos testes e ajustar a asserção do teste.

**Arquivo:** `src/pages/__tests__/AuditoriaApontamentoGeniusPage.contract.test.tsx`

- Ajustar os testes que travavam o contrato antigo:
  - Trocar `expect(p).toHaveProperty('numorp', '')` por: quando `numop=''`, `numorp` **não deve estar presente** (ou ser `undefined`).
  - Trocar a asserção de `numop: '12345'` para esperar `numorp: 12345` (número, não string).
  - Idem para `codori`.
  - Asserção de `AUDITORIA_KEEP_EMPTY`: passar a esperar array vazio.
- Manter o teste de paridade listagem × exportação intacto (continua válido).

**Arquivo:** `src/lib/api.ts`
- Sem mudança de comportamento. O helper `get()` já omite `undefined`/`""` por padrão, que é exatamente o que precisamos.

**Arquivo:** `src/components/erp/__tests__/ExportButton.test.tsx`
- Ajustar para refletir que `numorp`/`codori` vazios **não** devem aparecer mais na URL (remover a asserção que exigia `numorp=` vazio na query).

### Helper utilitário
Adicionar no topo do arquivo da página:
```ts
const toIntOrUndef = (v: unknown) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
```
Usar em `numorp` e `codori`.

### Validação manual
1. Abrir `/auditoria-apontamento-genius` sem preencher OP nem origem → request sai sem `numorp` e sem `codori` na URL → 200 OK.
2. Preencher OP `12345` → URL contém `numorp=12345` (sem aspas, inteiro) → 200 OK.
3. Preencher origem `110` → URL contém `codori=110` → 200 OK.
4. Exportar Excel com filtros vazios e com OP preenchida → mesmo comportamento.
5. Vitest (`npx vitest run`) passa todos os testes ajustados.

### Fora de escopo
- Backend (já está correto, é o frontend que precisa se adequar).
- UI/visual.
- Outras telas.

### Resultado
O 422 `unable to parse string as an integer` desaparece. A integração da Auditoria Genius com `/api/apontamentos-producao` e `/api/export/apontamentos-producao` passa a respeitar os tipos do contrato novo.

