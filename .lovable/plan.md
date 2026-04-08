

# Correção de mapeamento de campos - Engenharia x Produção

## Diagnóstico

Comparando os dados de referência fornecidos (projeto 663 / desenho 4200) com as colunas do frontend em `EngenhariaProducaoPage.tsx`, encontrei **8 colunas com nomes errados** que estão resultando em valores vazios ou incorretos.

A página Lead Time (já corrigida) usa aliases **diferentes** no backend e está funcionando. O problema é exclusivo da tela Engenharia x Produção.

### Mapeamento incorreto atual

| Frontend (column key) | API retorna (lowercase do SQL) | Valor esperado (Rev B) | Resultado atual |
|---|---|---|---|
| `kg_engenharia` | `kg_previsto_projeto` | 703,29 | Vazio |
| `kg_estrutura` | `kg_fabricado_cadastro` | 34.953,29 | Vazio |
| `perc_atendimento_producao` | `perc_produzido_sobre_previsto` | 0,22 | Vazio |
| `perc_expedido` | `perc_expedido_sobre_previsto` | 0,22 | Vazio |
| `status_fluxo` | `status_geral` | TOTALMENTE EXPEDIDO | Vazio |
| `primeira_producao` | `data_primeira_entrada_estoque` | 12/03/2026 | Vazio |
| `primeira_expedicao` | `data_primeira_expedicao` | 26/03/2026 | OK |
| `qtd_cargas` | `qtd_cargas` | 2 | OK (API retorna!) |
| `cliente` | `nome_cliente` | VIA MARIS... | Possivelmente vazio |

### Colunas que estão corretas
- `numero_projeto`, `numero_desenho`, `revisao`, `descricao_projeto` -- OK
- `data_liberacao_engenharia` -- OK
- `kg_produzido` (1.533), `kg_expedido` (1.533), `kg_patio` (0) -- OK
- `qtd_ops` (481), `ops`, `origens` -- OK
- `dias_producao_ate_expedicao` (14) -- OK
- `qtd_cargas` (2) -- OK, a API retorna este campo
- `primeira_expedicao` = `data_primeira_expedicao` -- OK

### Campos de dias (requer atenção)
- `dias_liberacao_ate_producao` (27) -- API retorna com este nome, mas o frontend usa `dias_engenharia_ate_producao` (fix anterior errado para esta página)
- `dias_total_liberacao_ate_expedicao` (41) -- API retorna com este nome, mas frontend usa `dias_total_ate_expedicao` (fix anterior errado para esta página)

**Nota**: O fix anterior no LeadTime está correto pois aquele endpoint usa aliases diferentes (`dias_engenharia_ate_producao`, `dias_total_ate_expedicao`). Mas na Engenharia x Produção, os aliases são `dias_liberacao_ate_producao` e `dias_total_liberacao_ate_expedicao`.

## Plano de implementação

### Arquivo: `src/pages/EngenhariaProducaoPage.tsx`

Corrigir todas as column keys para corresponder aos nomes retornados pela API:

1. `kg_engenharia` → `kg_previsto_projeto`
2. `kg_estrutura` → `kg_fabricado_cadastro`
3. `primeira_producao` → `data_primeira_entrada_estoque`
4. `perc_atendimento_producao` → `perc_produzido_sobre_previsto`
5. `perc_expedido` → `perc_expedido_sobre_previsto`
6. `status_fluxo` → `status_geral`
7. `cliente` → `nome_cliente`
8. Remover o render fallback `v != null ? v : '—'` de `qtd_cargas` (a API retorna o valor)
9. Não alterar `dias_producao_ate_expedicao` (14 -- correto)
10. Verificar se `dias_liberacao_ate_producao` e `dias_total_liberacao_ate_expedicao` precisam ser revertidos (o fix anterior trocou para `dias_engenharia_ate_producao` / `dias_total_ate_expedicao` que são aliases do endpoint de Lead Time, não deste endpoint)

**Nota sobre SaldoPatio e Dashboard**: Essas páginas usam endpoints diferentes (`/api/producao/saldo-patio` e `/api/producao/dashboard`) que podem usar aliases diferentes. Sem dados de referência desses endpoints, não alteramos essas páginas agora.

## Resultado esperado

Para o projeto 663 / desenho 4200, revisão B:
- Kg Previsto: 703,3
- Kg Fabricado: 34.953,3
- Kg Produzido: 1.533,0
- Kg Expedido: 1.533,0
- Kg Pátio: 0,0
- % Prod.: 0,22%
- % Expedido: 0,22%
- Cargas: 2
- 1ª Produção: 12/03/2026
- 1ª Expedição: 26/03/2026
- Status: TOTALMENTE EXPEDIDO
- Cliente: VIA MARIS NAVEGAÇÃO E PORTOS S.A.

