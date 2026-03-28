

# Ajustar filtros Situação OC e Motivo Desconto no Painel de Compras

## Situação atual
Os filtros já existem no código (linhas 107-121), mas precisam de ajustes para alinhar com o backend:

## Mudanças em `src/pages/PainelComprasPage.tsx`

### 1. Renomear campo `codigo_motivo` → `codigo_motivo_oc`
No estado `filters`, no `clearFilters`, e no campo Input — para corresponder ao parâmetro esperado pelo backend.

### 2. Atualizar opções do Select "Situação OC"
Substituir as opções atuais (que têm valor "9=Encerrada") pelas opções corretas do backend:
- `TODOS` → Todas
- `0` → Aberta
- `1` → Parcial
- `2` → Recebida
- `3` → Cancelada
- `4` → Fechada (novo)
- `5` → Suspensa (novo)

Usar valor `"TODOS"` como sentinela (já funciona assim).

### 3. Atualizar label do campo de desconto
De "Cód. Desconto" para "Motivo Desconto (CodMot)" com placeholder "Ex.: 19".

### 4. Garantir envio correto
Na função `search`, adicionar lógica para não enviar `situacao_oc` quando `"TODOS"` e não enviar `codigo_motivo_oc` quando vazio — limpando do params antes do envio.

### 5. Atualizar `situacaoLabel`
Adicionar mapeamento para valores 4 (Fechada) e 5 (Suspensa) na função usada na tabela.

