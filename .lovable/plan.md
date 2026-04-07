

# Adicionar KPI Cards nos módulos que ainda não possuem

## Situação atual
Páginas **com** KPI cards: Engenharia x Produção, Painel de Compras, Auditoria Tributária, Conciliação EDocs, Notas Recebimento, Estrutura BOM.

Páginas **sem** KPI cards: **Estoque**, **Onde Usa**, **Compras/Custos**.

(Número de Série tem fluxo diferente — não se aplica.)

## O que será feito
Adicionar KPI cards calculados a partir dos dados retornados (`data.dados`) em cada página, já que a API retorna `total_registros` na paginação e os dados numéricos podem ser agregados no frontend.

### 1. Consulta de Estoques (`EstoquePage.tsx`)
Cards calculados dos dados carregados:
| Card | Valor | Variante |
|------|-------|----------|
| Total Registros | `data.total_registros` | default |
| Itens na Página | `dados.length` | info |
| Saldo Total | soma de `saldo` dos itens visíveis | success |

### 2. Consulta Onde Usa (`OndeUsaPage.tsx`)
| Card | Valor | Variante |
|------|-------|----------|
| Total Registros | `data.total_registros` | default |
| Modelos Distintos | contagem única de `codigo_modelo` | info |
| Qtd. Utilizada Total | soma de `quantidade_utilizada` | success |

### 3. Consulta Compras/Custos (`ComprasProdutoPage.tsx`)
| Card | Valor | Variante |
|------|-------|----------|
| Total Registros | `data.total_registros` | default |
| Famílias | contagem única de `familia` | info |
| Preço Médio (média) | média de `preco_medio` | success |
| Último Preço NF (média) | média de `preco_nf_ultima_compra` | warning |

## Detalhes técnicos
- Importar `KPICard` e funções de formatação em cada página
- Calcular os agregados com `useMemo` sobre `data.dados`
- Exibir os cards em um grid responsivo (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) entre os filtros e a tabela, seguindo o padrão visual já usado nas outras páginas
- Usar animação escalonada com prop `index` nos KPICards

