
## Ação "Aplicar Revenda" — Auditoria Revenda (Faturamento Genius)

Editar apenas `src/components/faturamento/AuditoriaRevendaTab.tsx`. Sem mudanças em endpoint de consulta, Supabase ou outros arquivos.

### 1. Estender interface
Adicionar em `AuditoriaRevendaItem` os campos opcionais: `seqipd` (`string | number | null`). `empresa`, `filial`, `serie_nf`, `item_nf`, `pedido`, `numero_nf`, `nf`, `num_nfv` já existem.

### 2. Nova coluna "Ações"
Adicionar como última coluna do `cols`. Renderiza botão `sm` "Aplicar Revenda" que abre o modal carregando `row` no estado `linhaSelecionada`.

### 3. Modal "Aplicar Revenda"
Componente local usando `Dialog` do shadcn. Estado:
- `revenda: string` (obrigatório)
- `motivo: string` (obrigatório)
- `atualizarPedido: boolean` (default `true`)
- `atualizarNf: boolean` (default `true` se origem = NF, senão `false` e desabilitado)
- `sobrescrever: boolean` (default `false`)
- `aplicando: boolean`

Validação: `revenda.trim()` e `motivo.trim()` obrigatórios → toast de erro.

### 4. Chamada ao endpoint
`POST /api/faturamento-genius/auditoria-revenda/aplicar` via `api.post(...)` (já envia Bearer JWT).

Montagem do payload conforme a `origem` da linha:

**Linha NF:**
```ts
{
  origem: 'NF',
  codemp: row.empresa,
  codfil: row.filial,
  codsnf: row.serie_nf,
  numnfv: row.numero_nf || row.nf || row.num_nfv,
  seqipv: row.item_nf,
  numped: row.pedido,
  seqipd: row.seqipd,
  revenda, motivo,
  atualizar_pedido: atualizarPedido,
  atualizar_nf: atualizarNf,
  sobrescrever,
}
```

**Linha PEDIDO:**
```ts
{
  origem: 'PEDIDO',
  codemp: row.empresa,
  codfil: row.filial,
  numped: row.pedido,
  seqipd: row.seqipd,
  revenda, motivo,
  atualizar_pedido: atualizarPedido,
  atualizar_nf: false,
  sobrescrever,
}
```

### 5. Pós-sucesso
- `toast.success('Revenda aplicada no ERP com sucesso')`
- Fechar modal e limpar estado
- `consultar(pagina)` — recarrega a página atual; linhas corrigidas saem naturalmente

Em erro: `toast.error(err?.message || 'Falha ao aplicar revenda no ERP.')`.

### Arquivos afetados
- `src/components/faturamento/AuditoriaRevendaTab.tsx` (único)
