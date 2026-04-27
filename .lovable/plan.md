
# Importação dos dados reais de Passagens Aéreas (Jan–Mar/2026)

## O que foi encontrado na planilha

- **Aba `2026`**: 300 lançamentos detalhados, R$ 519.825,35, 155 colaboradores reais, período 02/01/2026 a 31/03/2026.
- **Tipos de transporte**: AÉREO (256), ÔNIBUS (37), HOTEL (5), LOCAÇÃO AUTOMÓVEIS (2).
- **Motivos**: Folga de Campo (92), Transferência de Obra (68), Viagem Administrativa (49), Contratação (37), Demissão (31), Férias (12), Remarcação (5), Lazer (3), Multa Cancelamento (1) + 2 textos longos de remarcação.
- **Centros de custo**: OBRA 640/645/649/653/655/660/662/664/665, E-RH, E-COMERCIAL, E-Sócios/Diretores, etc.

## Estado atual no banco

80 registros agregados, todos com colaborador `Consolidado BI`. Total bate (R$ 519.826) — é o mesmo dado, só que sem detalhe individual.

## Plano de execução

### 1. Limpar dados antigos
`DELETE FROM passagens_aereas` — apaga os 80 registros agregados de "Consolidado BI" (substituição completa, conforme você pediu).

### 2. Mapeamento de colunas (planilha → tabela)

| Planilha | Coluna no banco | Observação |
|---|---|---|
| DATA SOLICITACAO | `data_registro` | data principal do lançamento |
| DATA EMBARQUE | `data_ida` | |
| COLABORABOR | `colaborador` | |
| CIDADE ORIGEM | `origem` | mantém código IATA (THE/GRU/CWB) |
| CIDADE DESTINO | `destino` | |
| MOTIVO VIAGEM | `motivo_viagem` | texto original preservado |
| MOTIVO VIAGEM (normalizado) | `tipo_despesa` | mapeado para os 6 valores do enum existente (ver abaixo) |
| CENTRO DE CUSTO | `centro_custo` | |
| Tipo Transp. | `cia_aerea` | guardamos aqui o tipo (AÉREO / ÔNIBUS / HOTEL / LOCAÇÃO) já que não há campo dedicado e a cia real não vem na planilha |
| TOTAL | `valor` | já soma tarifa + tx embarque + serviço + extra |
| Forma Pgto + Ref. Mês Cartão | `observacoes` | concatenado |

Campos não disponíveis na planilha ficam `NULL`: `projeto_obra`, `fornecedor`, `numero_bilhete`, `localizador`, `data_volta`.

### 3. Normalização do `tipo_despesa`

O enum atual do dashboard tem: Folga de Campo, Demissão, Viagem Administrativa, Contratação, Transferência de Obra, Outros.
Mapeamento:
- FOLGA DE CAMPO → **Folga de Campo**
- DEMISSÃO → **Demissão**
- VIAGEM ADMINISTRATIVA → **Viagem Administrativa**
- CONTRATAÇÃO → **Contratação**
- TRANSFERENCIA DE OBRA → **Transferência de Obra**
- FÉRIAS, REMARCAÇÃO, LAZER, MULTA, REMARCACAO-ALTERACAO… → **Outros**

O texto original do motivo continua em `motivo_viagem` (íntegro), então o gráfico "Por Motivo de Viagem" do dashboard mostrará as 11 categorias reais.

### 4. Atualizar catálogo de colaboradores

Inserir no `colaboradores_catalogo` os 155 nomes reais da planilha (com `ON CONFLICT DO NOTHING` para não duplicar com os 152 já cadastrados). O KPI "Colaboradores (catálogo)" passa a refletir o universo real (~155–160 únicos).

### 5. Execução

Script Python (openpyxl/pandas) lê `/tmp/passagens.xlsx`, gera SQL `INSERT` em lote (300 linhas) e roda via migration. Após, valido com `SELECT COUNT, SUM, COUNT(DISTINCT colaborador)` esperando **300 / R$ 519.825,35 / 155**.

## Arquivos afetados

- Migration nova: limpa tabela e insere 300 registros + atualiza catálogo.
- Nenhuma mudança de código/UI necessária — o dashboard já está preparado para esse formato.

## Resultado esperado no /passagens-aereas após importação

- KPI **Total Geral**: R$ 519.825,35
- KPI **Registros**: 300
- KPI **Colaboradores (catálogo)**: ~160
- Gráfico **Por Motivo de Viagem**: distribuição real (Folga de Campo lidera com R$ 135 mil)
- Gráfico **Top 15 Centros de Custo**: OBRA 655 lidera, depois OBRA 660, 653…
- Tabela com 300 linhas filtráveis por colaborador / CC / tipo / data
