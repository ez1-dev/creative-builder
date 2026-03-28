

# Corrigir filtro Situação OC no Painel de Compras

## Problema identificado
O dropdown de "Situação da OC" está faltando a opção **"9" (Encerrada)**, que aparece frequentemente nos dados da API. Além disso, a limpeza de parâmetros na função `search` não remove `tipo_item` e `tipo_oc` quando são `"TODOS"`, enviando valores desnecessários ao backend.

Nos dados reais da API, vejo registros com `situacao_oc: 1` (Parcial) e `situacao_oc: 9` (Encerrada), mas **nenhum com `situacao_oc: 0` (Aberta)**. O filtro funciona corretamente — simplesmente não há OCs com status 0 nos dados atuais.

## Mudanças em `src/pages/PainelComprasPage.tsx`

### 1. Adicionar opção "Encerrada" (valor 9) ao dropdown Situação OC
Inserir `<SelectItem value="9">Encerrada</SelectItem>` após "Suspensa".

### 2. Limpar `tipo_item` e `tipo_oc` quando "TODOS" na função `search`
Adicionar na função `search`:
```
if (!params.tipo_item || params.tipo_item === 'TODOS') delete params.tipo_item;
if (!params.tipo_oc || params.tipo_oc === 'TODOS') delete params.tipo_oc;
```
Isso evita enviar parâmetros com valor `TODOS` ao backend, alinhando com o mesmo padrão já usado para `situacao_oc`.

