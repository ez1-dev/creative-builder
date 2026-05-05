## Objetivo

Na aba **Auditoria Revenda** (Faturamento Genius), exibir o confronto entre as três revendas (NF, Pedido, Item do Pedido) com badges de status, e ajustar a aplicação para enviar `codcli_revenda` (numérico) em vez de `revenda` (texto).

## Arquivo alterado

`src/components/faturamento/AuditoriaRevendaTab.tsx` (único). Sem alterações de endpoints, sem Supabase.

## Mudanças

### 1. Tipo `AuditoriaRevendaItem`

Adicionar campos opcionais:
- `revenda_nf?: string | null`
- `revenda_pedido?: string | null`
- `revenda_item_pedido?: string | null`
- `status_revenda?: string | null` (`OK` | `PENDENTE` | `DIVERGENTE` | etc.)

Manter `revenda` legado por compatibilidade (não usado mais nas colunas).

### 2. Colunas da tabela

Substituir a coluna única **Revenda** por três colunas + **Status**:

Ordem final:
```
Origem · Data Emissão · Pedido · NF · Série NF · Item NF · Cliente · Projeto · Produto · Derivação · Revenda NF · Revenda Pedido · Revenda Item Pedido · Status · Motivo · Ações
```

Helper:
```ts
const renderRevenda = (v: unknown) => {
  const s = (v ?? '').toString().trim();
  return s
    ? <span className="text-xs">{s}</span>
    : <Badge variant="outline" className="text-muted-foreground">Sem revenda</Badge>;
};
```

Coluna **Status** — badge por valor (case-insensitive):
- `OK` → `default` (verde via `bg-emerald-600 text-white`)
- `PENDENTE` → `bg-amber-500 text-white`
- `DIVERGENTE` → `destructive`
- vazio/desconhecido → `outline` cinza

### 3. Coluna NF (já existe `getNF`)

Manter prioridade `documento_nf || numero_nf || nf || id_nf || num_nfv`. Quando houver `serie_nf`, exibir `${nf}/${serie_nf}` na própria coluna NF (a coluna Série NF continua separada para filtro visual).

### 4. Modal "Aplicar Revenda no ERP"

Cabeçalho dinâmico em `DialogDescription`:
- NF: `Origem NF · Pedido {pedido} · NF {numero_nf}/{serie_nf}`
- PEDIDO: `Origem PEDIDO · Pedido {pedido}`

Defaults conforme origem:
- NF → `atualizar_pedido=true`, `atualizar_nf=true`, `sobrescrever=false`
- PEDIDO → `atualizar_pedido=true`, `atualizar_nf=false` (checkbox desabilitado), `sobrescrever=false`

Autocomplete de revenda permanece (já implementado).

### 5. Payload — trocar `revenda` por `codcli_revenda`

Substituir nos dois ramos de `aplicarRevenda()`:

```ts
codcli_revenda: Number(revendaSelecionada.codigo)
```

Remover a chave `revenda` do payload.

NF:
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
  codcli_revenda: Number(revendaSelecionada.codigo),
  motivo: motivoInput.trim(),
  atualizar_pedido: atualizarPedido,
  atualizar_nf: atualizarNf,
  sobrescrever,
}
```

PEDIDO:
```ts
{
  origem: 'PEDIDO',
  codemp: row.empresa,
  codfil: row.filial,
  numped: row.pedido,
  seqipd: row.seqipd,
  codcli_revenda: Number(revendaSelecionada.codigo),
  motivo: motivoInput.trim(),
  atualizar_pedido: atualizarPedido,
  atualizar_nf: false,
  sobrescrever,
}
```

Validação adicional: se `Number.isNaN(Number(revendaSelecionada.codigo))`, abortar com toast de erro.

### 6. Tratamento de erro 409

No `catch` de `aplicarRevenda()`:
- Detectar `err?.status === 409` (ou `err?.response?.status === 409`) e exibir a mensagem retornada pelo backend (`err?.detail || err?.message`) com `toast.error(...)`.
- Não fechar o modal — usuário pode marcar **Sobrescrever** e tentar novamente.
- Para outros erros, manter comportamento atual.

### 7. Sucesso

Mantém: `toast.success('Revenda aplicada no ERP com sucesso')`, fecha modal, `consultar(pagina)`.

## Fora de escopo

- Endpoints de consulta/aplicação/exportação/revendas — inalterados.
- Filtros, paginação, KPIs — inalterados.
