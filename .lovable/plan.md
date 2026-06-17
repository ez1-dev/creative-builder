# Plano — Centros de Custo expansíveis no Montador da DRE

Adapta a tela `/bi/contabilidade/dre-dinamica/montador` ao novo contrato do endpoint `/plano-contas`, onde cada conta retorna `centros_custo[]` com os campos `cd_centro_custos`, `cd_centro_custos_3`, `qtd_lancamentos` e `valor_total`.

## O que muda na UI

Na tabela "Contas disponíveis do ERP":

- Nova coluna de expandir (chevron) na primeira célula (antes do checkbox de seleção). Click no chevron alterna a linha de detalhe da conta.
- A coluna atual "Centros de custo" (com badges resumidos) é **substituída** por um indicador simples de contagem: `N CCs` (ex.: `3 CCs`) ou `—` quando vazio. O detalhe completo passa a viver na linha expandida.
- Ao expandir, abre uma linha logo abaixo, ocupando todas as colunas, com uma sub-tabela contendo:
  - `cd_centro_custos`
  - `cd_centro_custos_3`
  - `qtd_lancamentos` (alinhado à direita)
  - `valor_total` formatado em BRL (alinhado à direita; negativo em `text-destructive`)
- Se `centros_custo` estiver vazio ou ausente, a área expandida mostra exatamente:
  > "Sem centro de custo informado nos lançamentos desta conta."
- O front trata `undefined` como `[]`. Nenhum CC é inventado.

Comportamento de seleção mantido: o checkbox segue selecionando a **conta inteira** (vínculo continua por `MASCARA_CONTA` / `CONTA_CONTABIL`). A futura seleção combinada conta + CC fica como evolução, não entra agora.

Logs ao expandir uma conta:
```
console.log("[PLANO CONTAS] conta:", conta);
console.log("[PLANO CONTAS] centros_custo:", conta.centros_custo || []);
```

## Mudanças técnicas

### `src/lib/bi/dreMontadorApi.ts`
- Atualizar `PlanoContaCentroCusto` para o novo contrato:
  ```ts
  interface PlanoContaCentroCusto {
    cd_centro_custos: string;
    cd_centro_custos_3: string;
    qtd_lancamentos: number;
    valor_total: number;
  }
  ```
- Reescrever o mapeamento de `centros_custo[]` para usar os campos canônicos novos, com aliases defensivos:
  - `cd_centro_custos`: aceita `cd_centro_custos`, `cd_centro_custo`, `centro_custo`, `cd_ccu`, `codigo`.
  - `cd_centro_custos_3`: aceita `cd_centro_custos_3`, `cd_ccu_3`, `ccu_3`, `nivel_3`.
  - `qtd_lancamentos`: aceita `qtd_lancamentos`, `qtd`, `qtde`, `quantidade`.
  - `valor_total`: aceita `valor_total`, `valor`, `total`, `vl_saldo`, `saldo`.
- Aliases de array continuam (`centros_custo`, `ccu`, `centroscusto`, ...).
- Manter os warnings de diagnóstico (`semCcu`) e o `console.log` de sample.

### `src/pages/bi/contabilidade/DreMontadorPage.tsx`
- Novo state: `expandidos: Set<string>` (chave = `contaKey(c)`), com `toggleExpand(key)`.
- Header da tabela: adicionar `<th>` vazio (w-6) antes do checkbox e ajustar `colSpan` do estado vazio (8 → 10). Renomear "Centros de custo" para "CCs" e mostrar só a contagem.
- Linha da conta: célula com `ChevronRight`/`ChevronDown` (lucide) que chama `toggleExpand`. Log `[PLANO CONTAS]` ao expandir.
- Linha expandida: `<tr>` adicional renderizada condicionalmente quando `expandidos.has(k)`, com `<td colSpan={10}>` contendo uma tabela compacta (4 colunas) ou a mensagem de vazio. Background `bg-muted/30`.
- Remover o bloco de badges + tooltip "+N" atual (substituído pela linha expandida).
- Tipagem do `PlanoContaCentroCusto` no componente segue do `dreMontadorApi`.

### `docs/backend-bi-contabilidade-dre-dinamica-montador.md`
- Atualizar a seção "Agregação de centros de custo" e a tabela de campos para os nomes novos: `cd_centro_custos`, `cd_centro_custos_3`, `qtd_lancamentos`, `valor_total`.
- Atualizar o exemplo JSON em "Resposta" para o novo shape.
- Documentar `cd_centro_custos_3` como o código de CCU agregado no 3º nível da hierarquia (mantém origem em `bi_vm_lanc_contabil` + cadastro de CCU). Atualizar o SQL de referência conforme.

## Fora de escopo

- Vínculo combinado conta + CC (fica como próxima entrega; será novo `tipo_regra`).
- Mudanças em `/dre-dinamica`, `/vincular-contas` ou no fluxo de seleção/auditoria.
- Backend (apenas docs).
