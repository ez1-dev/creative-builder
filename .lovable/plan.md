

# BOM com visualização em árvore colorida por nível

## Objetivo
Adicionar uma visualização estilo árvore na tabela BOM, similar à imagem de referência (receita de "Bolo de cenoura"), onde:
- Itens são **indentados** conforme o nível hierárquico
- Cada nível tem uma **cor de fundo diferente** para facilitar a leitura
- Itens que são **modelos/subconjuntos** (possuem filhos) aparecem em **negrito**
- A descrição incorpora a indentação visual com traço (`-`) como na imagem

## Mudanças

### 1. `src/pages/BomPage.tsx`
- Reorganizar colunas para dar mais destaque à **Descrição** (principal coluna visual)
- Na coluna Descrição, aplicar:
  - `paddingLeft` proporcional ao nível (indentação em árvore)
  - Prefixo `"- "` para itens filhos
  - **Negrito** para itens que possuem filhos (são subconjuntos)
- Adicionar cor de fundo por linha baseada no `nivel`:
  - Nível 1: verde claro
  - Nível 2: rosa/vermelho claro  
  - Nível 3: amarelo claro
  - Nível 4+: azul claro
- Remover coluna "Status" redundante (a informação visual já indica modelos)

### 2. `src/components/erp/DataTable.tsx`
- Adicionar prop opcional `rowClassName` para permitir cor de fundo customizada por linha
- Manter compatibilidade com uso existente em outras páginas

## Paleta de cores (baseada na imagem)
| Nível | Cor |
|-------|-----|
| 1 | `bg-green-100` |
| 2 | `bg-red-50` / `bg-pink-50` |
| 3 | `bg-yellow-50` |
| 4+ | `bg-blue-50` |

