## Objetivo

Adicionar a coluna **Centro de Recurso** na grid de OPs em `/producao/impressao-op`.

## Arquivos

### `src/lib/producao/opcoesImpressao.ts`
- Em `OpcaoOp`, adicionar campos opcionais: `cod_cre?: string` e `descricao_centro_recurso?: string` (o backend pode ou não retornar; tratamos como opcional).

### `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Nova `<TableHead>` "C. Recurso" entre **Situação** e **Geração**.
- Nova `<TableCell>` exibindo:
  - `op.cod_cre` se vier na OP;
  - senão, se houver `filtros.cod_cre` ativo (grid filtrada por centro), exibir esse valor (assim a coluna fica preenchida no caso de uso principal do usuário);
  - senão, "—".
- Sem mudanças de lógica/filtros.

## Fora de escopo
- Backend (não exige novo campo — usamos o que vier; quando não vier, caímos no filtro ativo).
- Coluna de descrição do centro (só código; alinhado às demais colunas curtas).
