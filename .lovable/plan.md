## Problema

No `NovaRequisicaoOpPage`, o autocomplete de OP não popula CODORI/NUMORP porque:

1. `searchOps('')` é chamado **sem `cod_emp`**, e o endpoint `/api/producao/ordem-producao/opcoes` normalmente exige `cod_emp` — a lista volta vazia, então o usuário nunca consegue selecionar nada, e vê o rótulo "Seleção pré-carregada..." mas a lista está vazia.
2. Mesmo com resultados, `OpcaoOp.num_orp` pode vir como número; o `handleSelectOp` faz `String(...).trim()` (ok), mas o `OpAutocomplete` usa `String(op.num_orp ?? '') === value` para o check — sem impacto no preenchimento, mas confirma que o dado chega.

## Correção

Editar apenas `src/pages/requisicoes/NovaRequisicaoOpPage.tsx`:

1. **Passar `cod_emp` default `'1'`** em `fetchOps` e no pré-carregamento:
   ```ts
   const fetchOps = (q: string) => searchOps(q, { cod_emp: '1' });
   useEffect(() => { searchOps('', { cod_emp: '1' }).catch(() => {}); }, [searchOps]);
   ```
2. **Filtrar situações requisitáveis** (`sit_orp: 'L'` como padrão, já que a UI depois valida com `pode_requisitar`) — opcional, mas evita mostrar OPs canceladas/encerradas na lista. Vou incluir passando `sit_orp` só quando útil (na chamada de busca com query, deixar todos; no pré-carregamento também deixar todos para não frustrar o usuário).
3. **Guardar `cod_emp` do item selecionado** no state e usá-lo caso a consulta precise (hoje `useOpConsulta` só usa codori/numorp, então nenhum ajuste extra necessário aqui).
4. **Sincronizar edição manual**: se o usuário digitar em CODORI/NUMORP manualmente, limpar `opLabel` para não mostrar um rótulo desatualizado.

## Verificação

- Abrir `/requisicoes/nova-op`, abrir o combobox: lista deve carregar OPs (com `cod_emp=1`).
- Selecionar uma OP: campos CODORI e NUMORP preenchem, e a consulta dispara automaticamente exibindo cabeçalho + componentes.
- Digitar manualmente CODORI/NUMORP e clicar "Consultar OP": segue funcionando; o rótulo do combobox limpa.

Sem mudanças em backend, contratos ou lógica de negócio.
