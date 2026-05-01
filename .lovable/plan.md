## Contexto

A documentação atual em `docs/backend-sgu-codusu-bug.md` cita campos errados (`R910USU.CODUSU`, `R910USU.DESUSU`) que **não existem**. O esquema real é:

**R910USU** (cadastro/colaborador)
- `CODENT` — código numérico do usuário (FK lógica)
- `NOMCOM` — nome completo
- `DESUSU` — descrição/login

**R999USU** (usuários SGU)
- `CODUSU` — código numérico (PK do usuário SGU) ← este é o `codusu` que o frontend precisa
- `NOMUSU` — login textual

A junção correta é `R910USU.CODENT = R999USU.CODUSU`.

## Plano

### 1. Reescrever `docs/backend-sgu-codusu-bug.md`

Substituir integralmente o conteúdo para refletir o schema real:

- **Tabelas e campos corretos**: documentar R999USU (CODUSU, NOMUSU) e R910USU (CODENT, NOMCOM, DESUSU), deixando claro que `R910USU.CODUSU` não existe.
- **SQL sugerido** (versão fornecida pelo usuário):
  ```sql
  SELECT
      R.CODUSU                          AS codusu,
      LTRIM(RTRIM(R.NOMUSU))            AS nomusu,
      LTRIM(RTRIM(A.NOMCOM))            AS nomcom,
      LTRIM(RTRIM(A.DESUSU))            AS desusu,
      LTRIM(RTRIM(R.TIPCOL))            AS tipcol,
      LTRIM(RTRIM(R.NUMEMP))            AS empcol,
      LTRIM(RTRIM(R.CODFIL))            AS filcol,
      CASE WHEN A.CODENT IS NULL THEN 0 ELSE 1 END AS existe_r910,
      CASE WHEN R.CODUSU IS NULL THEN 0 ELSE 1 END AS existe_r999,
      (SELECT COUNT(*) FROM E099USU E WHERE E.CODUSU = R.CODUSU) AS qtd_empresas_e099usu
  FROM R999USU R
  LEFT JOIN R910USU A ON A.CODENT = R.CODUSU
  ORDER BY R.NOMUSU;
  ```
- **Schema JSON esperado** (com `nomcom` e `desusu` adicionais):
  ```json
  {
    "codusu": 301,
    "nomusu": "lucas.martins",
    "nomcom": "Lucas Martins - CUSTEIO",
    "desusu": "lucas.martins",
    "tipcol": null,
    "empcol": null,
    "filcol": null,
    "existe_r910": 1,
    "existe_r999": 1,
    "qtd_empresas_e099usu": 2
  }
  ```
- **Pydantic model** atualizado com `nomcom: Optional[str]` e `desusu: Optional[str]`.
- **Critério de validação**:
  - `codusu` deve ser integer
  - `nomusu` deve ser string (login)
  - `desusu` / `nomcom` devem ser campos **separados** (não duplicar com `codusu`)
  - Nunca retornar login textual em `codusu`
  - Rotas `/api/sgu/usuarios/{codusu}` devem aceitar inteiro
- **Endpoints afetados** (mantém a lista atual: lista, detalhe, resumo-acessos, comparar, duplicar-preview-campos, duplicar-parametros).

### 2. Estender tipo e mapeamento no frontend para suportar `nomcom`/`desusu`

`src/lib/sguApi.ts`:
- Adicionar `nomcom?: string | null` e `desusu?: string | null` à interface `SguUsuario`.
- Em `normalizarUsuario`, mapear via `pickFirst` os campos `nomcom` (`['nomcom','nom_com','nome_completo']`) e `desusu` (`['desusu','des_usu','descricao_usuario','login']`).

### 3. Mostrar nome completo na tabela de usuários

`src/components/sgu/SguUsuariosTab.tsx`:
- Adicionar coluna **"Nome completo"** exibindo `nomcom` (fallback `desusu` ou `—`) ao lado de `nomusu`.
- Manter o banner/alerta de bug do backend como já implementado (ele desaparece automaticamente quando o backend devolver `codusu` numérico).

## Arquivos a alterar
- `docs/backend-sgu-codusu-bug.md` — reescrita completa
- `src/lib/sguApi.ts` — extensão do tipo + mapeamento
- `src/components/sgu/SguUsuariosTab.tsx` — coluna "Nome completo"

## Próximo passo
Você envia o `docs/backend-sgu-codusu-bug.md` corrigido ao desenvolvedor backend. Quando ele aplicar o SQL e o response model, a tela funciona automaticamente: códigos numéricos, nome completo (`nomcom`) na coluna nova, e botões Detalhes/Origem/Destino habilitados.
