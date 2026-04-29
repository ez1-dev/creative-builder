## Renomear colunas da tabela de Passagens Aéreas

Os cabeçalhos da tabela de registros estão com nomes que não refletem o conteúdo real exibido. O ajuste é apenas de rótulos — os dados já vêm corretos dos campos `tipo_despesa` e `cia_aerea`.

### Mudanças

Em `src/components/passagens/PassagensDashboard.tsx`, na tabela de registros (linhas 837 e 839):

| Cabeçalho atual | Novo cabeçalho | Conteúdo (não muda) |
|---|---|---|
| Tipo | **Motivo da Viagem** | `r.tipo_despesa` (ex: "Viagem Administrativa") |
| Cia | **Tipo** | `r.cia_aerea` (ex: "AÉREO", "LOCAÇÃO AUTOMOVEIS S/MOTORISTA") |

### Ajustes adicionais para consistência

- **Exportação CSV** (linha 972): atualizar o array `headers` trocando `'Tipo'` por `'Motivo da Viagem'` e `'Cia'` por `'Tipo'`, mantendo a mesma ordem dos campos.
- **Comentário** na linha 828 sobre layout de colunas: ajustar para refletir os novos nomes.
- **Diálogo de Importação** (`ImportarPassagensDialog.tsx`, linha 314): verificar se o cabeçalho "Tipo" desse preview também precisa do mesmo ajuste; se sim, alinhar para consistência visual.

### Fora do escopo

- Não mexer nos nomes das chaves do banco (`tipo_despesa`, `cia_aerea`) nem nos campos do formulário de cadastro — apenas rótulos visuais da listagem/exportação.
- Gráficos "Por Motivo de Viagem" e filtros já usam a terminologia correta e não precisam de mudança.
