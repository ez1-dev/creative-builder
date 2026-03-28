

# Adicionar filtros Situação OC e Código Desconto ao Painel de Compras

## Mudanças

### `src/pages/PainelComprasPage.tsx`

1. **Adicionar campos ao estado `filters`**:
   - `situacao_oc: ''` — Situação da OC (SitOcp)
   - `codigo_motivo: ''` — Código do motivo/desconto (CodMot)

2. **Adicionar campos visuais no `FilterPanel`**:
   - **Situação OC**: Select/dropdown com as opções já mapeadas no `situacaoLabel` (Aberta=0, Parcial=1, Recebida=2, Cancelada=3, Encerrada=9, e "Todas" como default vazio)
   - **Cód. Desconto**: Input text para filtro livre por CodMot

3. **Atualizar `clearFilters`**: Incluir os dois novos campos no reset

4. **Lógica de envio**: Os valores são passados como params na chamada API (já funciona automaticamente pelo spread `...filters`)

