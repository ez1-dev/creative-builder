

# Ajustar filtro de Desconto no Painel de Compras

## Mudanças em `src/pages/PainelComprasPage.tsx`

### 1. State dos filtros
- Alterar `codigo_motivo_oc` de Input livre para valor padrão `'TODOS'`
- Adicionar `observacao_oc: ''` ao state de filtros e ao `clearFilters`

### 2. Substituir o filtro atual (linha 130)
Trocar o Input "Motivo Desconto (CodMot)" por:
- **Select** `codigoMotivoOcPainelCompras` com opções: `TODOS` e `19 = Com desconto`
- **Input** `observacaoOcPainelCompras` para pesquisar valor/texto do desconto

### 3. Lógica de envio (função `search`)
- Se `codigo_motivo_oc === 'TODOS'` → remover do params (já existente)
- Se `codigo_motivo_oc === '19'` → enviar `codigo_motivo_oc=19`
- Se `observacao_oc` preenchido → enviar `observacao_oc=<valor>`
- O backend já trata a lógica de filtro SQL conforme descrito

### Detalhes técnicos
- Componentes já importados: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Input`, `Label`
- Nenhuma dependência nova necessária

