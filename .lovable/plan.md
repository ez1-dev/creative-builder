## Melhorias no Cabeçalho da Impressão de OP

Problemas identificados no print atual:
1. Barcode da Origem/O.P. está pequeno e a legenda fica solta abaixo, desalinhada do box.
2. Tabela REV/Agrupamento mostra "REV" duplicado (cabeçalho + valor) porque o campo `revisao` está vindo como "REV". Layout também fica desproporcional ao lado do box principal.
3. Box de dados (Origem, O.P., Qtde., etc.) tem colunas largas demais — sobra muito espaço entre label e valor.
4. "Página: 1/1" fica isolado no topo direito, sem moldura.

### Alterações em `src/components/producao/OpPrintSheet.tsx`

**Topo (Origem/O.P. + Página):**
- Envolver o barcode num bloco mais compacto com borda, juntando título + código + legenda.
- Mover "Página: 1/1" para a mesma linha do título "Origem/O.P." (canto direito), removendo o bloco solto.

**Linha principal (dados + REV/Agrupamento):**
- Ajustar `op-grid-2col` para `3fr 1fr` (mais espaço para os dados).
- Reduzir largura da coluna de labels do `op-kv` de 90px para 70px.
- Agrupar Origem + O.P. na mesma linha (lado a lado) e Qtde. + U.M. também, economizando linhas verticais.
- Produto fica em linha cheia (já é).
- Início Prev. + Pedido lado a lado; Período + Situação lado a lado.

**Bloco REV/Agrupamento:**
- Trocar de tabela 2x2 para layout vertical empilhado mais limpo:
  ```text
  ┌─────────────┐
  │ REV         │  (label)
  │ {revisao}   │  (valor grande)
  ├─────────────┤
  │ Agrupamento │
  │ {agrup.}    │
  └─────────────┘
  ```
- Isso elimina a duplicação visual de "REV".

### Alterações em `src/components/producao/op-print.css`

- Novo grid `.op-header-top` (flex space-between) para título + página.
- Novo `.op-barcode-box` com borda envolvendo barcode + legenda.
- Refinar `.op-kv` para suportar 2 pares por linha quando necessário (reuso de `.op-kv-2col` já existente).
- Substituir `.op-rev-grid` por `.op-rev-stack` com `display: flex; flex-direction: column;` e divisória interna.

### Fora de escopo
- Seção de componentes, operações, observações, rodapé, dados/endpoints.

### Resultado esperado
Cabeçalho mais denso, sem duplicação visual de "REV", barcode emoldurado e proporções equilibradas entre o box principal e o bloco de revisão.
