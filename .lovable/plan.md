## Objetivo

Na tabela antiga de apontamento dentro de cada operação:
- Mudar de **5 linhas para 15 linhas** (mantendo as 6 colunas).
- Adicionar **espaço entre a tabela de 15 linhas e a tabela nova de 20 linhas**.
- Garantir que **a tabela antiga não quebre entre páginas** (page-break-inside: avoid).

## Arquivos

- `src/components/producao/OpPrintSheet.tsx` — bloco `renderOperacao` (tabela antiga, atualmente com `length: 5` e wrapper `<table style={{ marginTop: 4 }}>`).
- `src/components/producao/op-print.css` — adicionar regra `.op-apontamento-old` para evitar quebra de página.

## Mudanças

### 1. `OpPrintSheet.tsx`
- Trocar `Array.from({ length: 5 })` por `Array.from({ length: 15 })`.
- Trocar o wrapper `<table style={{ marginTop: 4 }}>` por `<table className="op-apontamento-old">` (mantendo `thead`/`tbody` como estão).
- Na tabela nova (20 linhas), trocar `<table className="op-apontamento-table">` para `<table className="op-apontamento-table" style={{ marginTop: 12 }}>` — espaço entre as duas tabelas.

### 2. `op-print.css`
Adicionar:
```text
.op-apontamento-old {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
  page-break-inside: avoid;
  break-inside: avoid;
}
@media print {
  .op-apontamento-old {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
```

## Fora de escopo

- Sem mudanças em filtros, header, cabeçalho da OP, lista de componentes ou API.
- A tabela nova (20 linhas × 9 colunas) já tem `page-break-inside: avoid` e permanece como está, exceto pela margem superior.
