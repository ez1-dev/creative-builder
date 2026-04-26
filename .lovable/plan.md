## Diagnóstico

A tela atual mostra widgets **sobrepostos** (tabela COLABORADOR encostada em outra tabela), KPI grande não aparece e o layout não bate com a referência. Causas:

1. **Os botões "Aplicar layout Power BI" e "Organizar automaticamente" só existem no modo edição** (após clicar Personalizar). O usuário provavelmente clicou Personalizar mas não viu / não rodou eles, ou rodou só um sem o outro, ficando com tamanhos do banco antigo.
2. **Tabela compacta repete o título**: o cabeçalho da coluna mostra "COLABORADOR" e o título do card também — visualmente redundante.
3. **Não há reflow**: quando widgets antigos têm `w/h` salvos com posições conflitantes, o grid empilha em cima.

## Soluções

### 1. Ação combinada e direta — `DashboardBuilder.tsx`

Trocar **"Aplicar layout Power BI"** para fazer tudo em uma única ação:
- Deletar widgets atuais
- Inserir os 5 widgets do blueprint (já feito)
- **Recarregar do banco** (já feito)

E **fora do modo edição**, expor um botão único e visível **"Layout Power BI"** ao lado de "Personalizar", que:
- Entra em modo edição automaticamente
- Roda `applyPowerBILayout()` 
- Salva na hora (`saveAll()`)
- Sai do modo edição

Resultado: 1 clique aplica o padrão da imagem.

### 2. Tabela compacta — `WidgetRenderer.tsx`

Remover o cabeçalho duplicado: na versão compacta, o `<TableHead>` da primeira coluna deixa só **"Categoria"** ou nada, já que o título do card já identifica (ex.: "CENTRO DE CUSTO"). Manter apenas "Soma de TOTAL" à direita.

### 3. Garantir layout sem sobreposição

No `applyPowerBILayout`, o blueprint atual já especifica posições não conflitantes (`x:0/6`, `y:0/5` com `w:6 h:5` etc.). Vamos confirmar e ajustar para o grid de 12 cols caber sem sobrar gap:

```
Linha 1 (y=0): TOTAL Mês [x=0,w=7,h=5] | MOTIVO VIAGEM [x=7,w=5,h=5]
Linha 2 (y=5): CENTRO CUSTO [x=0,w=4,h=5] | KPI [x=4,w=4,h=5] | COLABORADOR [x=8,w=4,h=5]
```

Larguras ajustadas para somar exatamente 12 em cada linha.

### 4. Dimensões mínimas adequadas

Ajustar `minW`/`minH` no layouts mapping para que nada fique menor do que o necessário e force a quebra correta:
```ts
const layouts = { lg: widgets.map((w) => ({ i: w.id, ...w.layout, minW: 3, minH: 3 })) };
```

## Arquivos afetados

- `src/components/dashboard-builder/DashboardBuilder.tsx`
  - Novo botão **"Layout Power BI"** fora do modo edição (ação direta: aplica + salva)
  - Blueprint com larguras ajustadas (7+5 / 4+4+4)
  - `minW: 3, minH: 3`
- `src/components/dashboard-builder/WidgetRenderer.tsx`
  - Remover título duplicado no cabeçalho da tabela compacta

## Validação

Em `/passagens-aereas`, sem entrar em Personalizar:
1. Clicar **Layout Power BI** → o dashboard se reconstrói sozinho com os 5 widgets bem posicionados.
2. Não deve haver sobreposição.
3. KPI grande "R$ X Mil" visível no centro inferior.
