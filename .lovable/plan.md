## Diagnóstico

O item "DRE Padrão" **existe no `menuCatalog.ts`** (subgrupo `erp-financeiro`) e a rota `/contabilidade/dre-padrao` está registrada. O motivo de não aparecer na sidebar do usuário RENATO (e do Cesar) é o **layout personalizado** salvo em `public.menu_layout_user`:

- Todos os itens originais do subgrupo "Financeiro e Contábil" (`Conciliação EDocs`, `Balanço`, `DRE Studio — Visão Geral`, `DRE Studio — Novo Modelo`, etc.) foram **movidos** para um subgrupo customizado `custom:sub:mrt75hhvp3evt3` dentro do topo `erp`.
- O novo item `/contabilidade/dre-padrao` **não tem entrada em `moves`**, então continua sob o subgrupo base `Financeiro e Contábil` — que o usuário abandonou / não abre mais.

Verificação (dados reais do Cloud):
- `layout.moves` do RENATO inclui `/contabilidade/balanco`, `/contabilidade/dre-studio`, `/contabilidade/dre-studio/novo` → todos apontando para `topId:"erp"`, `subGroupId:"custom:sub:mrt75hhvp3evt3"`.
- Não há `moves["/contabilidade/dre-padrao"]`.
- `orders["erp:erp-financeiro"]` lista os antigos + `/auditoria-tributaria`, mas não o novo item.

## Correção

Migração one-shot no Cloud: para todos os `menu_layout_user` que já movem `/contabilidade/dre-studio` para algum subgrupo customizado, replicar o mesmo destino para `/contabilidade/dre-padrao` e anexá-lo à ordem daquele subgrupo (logo após `/contabilidade/balanco`, se existir). Mesma coisa para `menu_layout_global`.

Pseudo-SQL:

```text
update menu_layout_user set layout = jsonb_set(...)
  where layout->'moves'->'/contabilidade/dre-studio' is not null
    and layout->'moves'->'/contabilidade/dre-padrao' is null;
```

Passos:
1. Ler cada linha alvo (`user_id`, `layout`).
2. Em `layout.moves`, adicionar `"/contabilidade/dre-padrao": {topId, subGroupId}` copiando de `moves["/contabilidade/dre-studio"]`.
3. Em `layout.orders["<topId>:<subGroupId>"]`, inserir `"/contabilidade/dre-padrao"` logo após `"/contabilidade/balanco"` (ou no início se este não estiver na lista).
4. Persistir via `UPDATE`.

Feito isso, a DRE Padrão aparece no mesmo lugar onde os usuários já veem DRE Studio / Balanço, sem precisar mexer em Personalizar Menus.

## Prevenção (opcional, pequeno ajuste de código)

Em `src/hooks/useMenuLayout.tsx > applyLayout`, quando um leaf **novo** entra em um subgrupo base cujos irmãos foram todos movidos para o mesmo destino, seguir o destino majoritário. Isso evita novos itens caírem em um subgrupo "esvaziado" para usuários que personalizaram o menu.

Regra:
- Para cada subgrupo base, se ≥ 60% dos itens tem `moves[url]` apontando para o mesmo `{topId, subGroupId}`, e o item corrente não tem `moves`, aplicar esse destino como fallback.

Este item é opcional — o passo 1 já resolve o incidente atual.

## Arquivos / operações

- `menu_layout_user` — UPDATEs por usuário afetado (ao menos RENATO e Cesar).
- `menu_layout_global` — mesmo tratamento se `moves["/contabilidade/dre-studio"]` estiver presente.
- (Opcional) `src/hooks/useMenuLayout.tsx` — heurística de "seguir irmãos movidos" para itens novos.

## Critérios de aceite

- Após a migração, RENATO e Cesar veem "DRE Padrão" no mesmo subgrupo onde já enxergam "Balanço Patrimonial" e "DRE Studio — Visão Geral".
- Nenhum item existente muda de posição.
- Realtime do `menu_layout_user` propaga a mudança sem exigir refresh manual.
