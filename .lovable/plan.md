## Regra final do layout de impressão (Quebrar por operação)

### Até 7 componentes
```text
Página 1: cabeçalho + operação + apontamento + componentes (abaixo da operação)
Próximas: desenhos (se marcado)
```

### Mais de 7 componentes
```text
Página 1: cabeçalho + operação + apontamento
Página 2: cabeçalho + Relação de Componentes Necessários
Próximas: desenhos (se marcado)
```

Vale com ou sem desenhos.

## O que vou ajustar

1. **Posição dos componentes na 1ª folha (≤ 7)**
   - Mover o bloco de componentes para **abaixo da operação** (hoje está acima).
   - Render compacto, só na folha da **última operação** (para não duplicar entre páginas de operações).
   - Garantir que componentes apareçam **uma única vez por OP**, nunca antes da operação.

2. **Folha separada de componentes (> 7)**
   - Sair sempre na 2ª folha, com cabeçalho da OP.
   - Posicionada **depois das operações** e **antes dos desenhos**.
   - Acionada exclusivamente pelo critério `componentes.length > 7`, independente de desenhos.

3. **Desenhos**
   - Continuam por último, sem influenciar a decisão dos componentes.
   - Cada desenho em uma página A4 dedicada.

4. **CSS de impressão**
   - Ajustar `.op-operation-page` e `.componentes-page` para travar a folha em A4 e forçar `page-break-after`.
   - Adicionar regra compacta para a tabela de componentes inline (fontes/paddings menores) para caber sem estourar a página.
   - Não mexer no modo padrão (sem quebra por operação).

5. **Validar nos 3 fluxos**
   - Impressão individual
   - "Visualizar selecionadas"
   - "Imprimir visualização"

## Detalhes técnicos
- Arquivos-alvo:
  - `src/components/producao/OpPrintSheet.tsx` — fluxo `quebrarPorOperacao`:
    - inline somente quando `componentes.length <= 7`, **abaixo** da operação e **apenas** na última iteração de `operacoes.map`.
    - `renderComponentesPage()` chamado uma única vez quando `componentes.length > 7`, após o `map` das operações e antes dos desenhos.
  - `src/components/producao/op-print.css` — regras `@media print` para `.op-operation-page`, `.componentes-inline` (compacto) e `.componentes-page`.
- Escopo excluído:
  - sem mudança de API
  - sem mudança na busca individual
  - sem mudança no modo padrão (sem quebra por operação)
  - sem alteração no fluxo de desenhos

## Resultado esperado
- 6 componentes: 1 folha com tudo + desenhos depois (se houver).
- 8 componentes: folha 1 só operação, folha 2 só componentes (com cabeçalho), depois desenhos (se houver).
- 8 componentes sem desenho: termina na folha 2.