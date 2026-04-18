
O usuário relata que os centros de custo dos rateios não estão corretos no modo árvore.

## Diagnóstico

O frontend apenas renderiza o que o backend retorna em `/api/contas-pagar-arvore` e `/api/contas-receber-arvore`. Os campos exibidos (`codigo_centro_custo`, `descricao_centro_custo`, `numero_projeto`, `percentual_rateio`, `valor_rateado`) vêm direto do JSON da API.

Se os centros de custo dos rateios estão errados, há duas causas possíveis — ambas no **backend FastAPI**, que não está neste repositório:

1. **JOIN incorreto** entre tabela de rateio (`E075RAT` / `E550RAT`) e cadastro de centro de custo (`E550CCU`) — possivelmente faltando filtro por empresa (`cod_emp`).
2. **Tabela de origem errada** — usando `cod_ccu` do título (cabeçalho) em vez do `cod_ccu` específico de cada linha de rateio.

Não consigo corrigir SQL do backend daqui. O que posso fazer é:

## Plano

### 1. Atualizar `docs/backend-contas-centro-custo-projeto.md`
Adicionar nova seção **"Rateios com centro de custo incorreto"** documentando para o time backend:
- Sintoma: linhas filhas (`tipo_linha = 'RATEIO'`) retornando `codigo_centro_custo` / `descricao_centro_custo` divergentes do ERP.
- Causa provável: JOIN sem `cod_emp` ou leitura do CCU do cabeçalho.
- Correção esperada: ler `cod_ccu` da própria linha de rateio (`E075RAT.cod_ccu` para pagar, `E550RAT.cod_ccu` para receber) e fazer JOIN composto `(cod_emp, cod_ccu)` com `E550CCU`.
- Pseudo-SQL de referência para cada endpoint.

### 2. Adicionar tooltip de debug no `FinanceiroTreeTable`
Em modo dev, exibir `title` na célula CCU mostrando os campos brutos (`codigo_centro_custo`, `descricao_centro_custo`, `id_linha`, `codigo_pai`) para facilitar o cruzamento manual com o ERP.

### Sem alterações em
Rotas, autenticação, modos plano/agrupado, exportação ou outros módulos.
