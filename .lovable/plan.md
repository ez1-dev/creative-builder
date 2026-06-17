# Montador da DRE Gerencial

Tela em duas colunas para o usuário vincular contas/máscaras do ERP a linhas da DRE Dinâmica. Toda a lógica de cálculo e vínculo fica no FastAPI.

## Rota e navegação
- Rota: `/bi/contabilidade/dre-dinamica/montador`
- Sidebar: novo item "Montador DRE Gerencial" abaixo de "DRE Dinâmica Gerencial"
- `screenCatalog`: código `CONT_DRE_MONTADOR`

## Arquivos

### `src/lib/bi/dreMontadorApi.ts` (novo)
Cliente FastAPI (Bearer + `ngrok-skip-browser-warning`):

```ts
export interface PlanoContaErp {
  cd_mascara: string;
  cd_conta_contabil: string;
  qtd_lancamentos: number;
  valor_total: number;
  ja_vinculada: boolean;
  linhas_vinculadas: string[]; // descrições/códigos das linhas
}
export interface PlanoContasParams {
  anomes_ini: string; anomes_fim: string;
  modelo_id?: string | null;
  busca?: string;
  somente_nao_vinculadas?: boolean;
  somente_vinculadas?: boolean;
  limite?: number;
}
export async function fetchPlanoContasDinamica(p: PlanoContasParams): Promise<PlanoContaErp[]>;

export interface VincularContasPayload {
  modelo_id: string;
  linha_id: string;
  tipo_regra: 'MASCARA_CONTA' | 'CONTA_CONTABIL';
  operador: 'COMECA_COM' | 'IGUAL';
  sinal: 1 | -1;
  prioridade: number;
  contas: { cd_mascara: string; cd_conta_contabil: string }[];
}
export async function vincularContasDinamica(payload: VincularContasPayload): Promise<{ vinculadas: number }>;
```
- `GET /api/bi/contabilidade/dre-dinamica/plano-contas` com os params acima
- `POST /api/bi/contabilidade/dre-dinamica/vincular-contas` com o body especificado
- Console logs antes do POST: `[MONTADOR DRE] payload vínculo:`

### `src/pages/bi/contabilidade/DreMontadorPage.tsx` (novo)

Header fixo com filtros globais:
- Ano, Mês inicial, Mês final (montam `anomes_ini`/`anomes_fim` `YYYYMM`)
- Modelo (carregado de `bi_dre_modelos`; default = rascunho mais recente; obrigatório para vincular)
- Botão "Recarregar tudo"

#### Coluna esquerda — "Linhas da DRE" (col-span 5/12)
- `fetchDreDinamica({ano,mes_ini,mes_fim,modelo_id})` (endpoint que já existe na sessão anterior)
- Lista virtualizada com:
  - `ordem`, `descrição`, badge `tipo_linha`, `realizado` em BRL
  - Indentação `(nivel-1)*16px`
  - Row clicável → marca `linhaSelecionada` (precisa de `id` da linha — vem de `bi_dre_estrutura_v2.id`; pedimos ao backend incluir `linha_id` no payload da DRE Dinâmica; fallback: consulta direta `bi_dre_estrutura_v2` por `modelo_id`+`codigo_linha` no Cloud para resolver o `id`)
  - Destaque visual: `bg-primary/10 border-l-4 border-primary` na linha selecionada
  - Log: `console.log("[MONTADOR DRE] linha selecionada:", linhaSelecionada);`

#### Coluna direita — "Contas disponíveis do ERP" (col-span 7/12)
- Filtros locais (acima da tabela): busca (debounce 300ms), "Somente não vinculadas", "Somente vinculadas" (radio mutuamente exclusivo + "Todas"), "Limite" (50/100/250/500/1000, default 250)
- Tabela com cabeçalho sortable (máscara, conta, qtd, valor):
  - Checkbox de seleção (cabeçalho com "selecionar todos visíveis")
  - `cd_mascara` (mono)
  - `cd_conta_contabil` (mono)
  - `qtd_lancamentos` (right)
  - `valor_total` em BRL; vermelho (`text-destructive`) quando < 0
  - `ja_vinculada` → badge "Vinculada" (`variant=secondary`)
  - `linhas_vinculadas` → tooltip / lista de chips com códigos
- Rodapé de ação:
  - Select "Tipo de vínculo": MASCARA_CONTA / CONTA_CONTABIL
  - Radio "Sinal": `+1 Somar como está` / `-1 Inverter sinal`
  - Input "Prioridade" (default 100)
  - Botão `Vincular contas à linha selecionada` (disabled sem linha OU sem contas)
  - Log: `console.log("[MONTADOR DRE] contas selecionadas:", contasSelecionadas);`

#### Fluxo de vínculo
1. Validações:
   - `modeloId` definido
   - `linhaSelecionada` definido (toast destructive: "Selecione uma linha da DRE")
   - `contasSelecionadas.length > 0` (toast destructive: "Selecione ao menos uma conta")
2. Montar payload exato do spec (operador derivado do tipo: `MASCARA_CONTA→COMECA_COM`, `CONTA_CONTABIL→IGUAL`)
3. Logar payload
4. `await vincularContasDinamica(payload)`
5. Em sucesso:
   - `toast.success("Contas vinculadas com sucesso.")`
   - Limpar `contasSelecionadas`
   - Re-fetch `plano-contas` + `dre-dinamica` em paralelo
6. Em erro: toast destructive com `error.message`

## Estado da página
```
{ ano, mesIni, mesFim, modeloId,
  linhas, linhaSelecionada,
  contas, contasSelecionadas: Set<string>,
  filtroBusca, filtroVinculo, limite,
  sortBy, sortDir,
  tipoRegra: 'MASCARA_CONTA', sinal: 1, prioridade: 100,
  loadingLinhas, loadingContas, vinculando }
```
Key da conta: `${cd_mascara}||${cd_conta_contabil}`.

## Backend (documentação)
Criar `docs/backend-bi-contabilidade-dre-dinamica-montador.md` com os contratos dos dois endpoints novos:

```
GET /api/bi/contabilidade/dre-dinamica/plano-contas
  query: anomes_ini, anomes_fim, modelo_id?, busca?,
         somente_nao_vinculadas?, somente_vinculadas?, limite?
  resp: [{ cd_mascara, cd_conta_contabil, qtd_lancamentos,
           valor_total, ja_vinculada, linhas_vinculadas[] }]

POST /api/bi/contabilidade/dre-dinamica/vincular-contas
  body: { modelo_id, linha_id, tipo_regra, operador, sinal,
          prioridade, contas: [{cd_mascara, cd_conta_contabil}] }
  resp: { vinculadas: number }
  efeito: insere N linhas em bi_dre_linha_regra (idempotente por
          modelo_id + linha + chave da conta), registra auditoria.
```

Também adicionar campo `linha_id` (uuid) ao payload de `/dre-dinamica` ou, alternativamente, o front resolve via consulta Cloud em `bi_dre_estrutura_v2`.

## Fora de escopo
- Edição/inclusão de linhas da DRE (já existe em `/dre/configuracao`)
- Drill no realizado (já em `DreDrillDrawer`)
- Cálculo no front (proibido pelo spec)

## Pergunta única
O endpoint `/dre-dinamica` precisa devolver `linha_id` (uuid de `bi_dre_estrutura_v2`) para que o front mande no `vincular-contas`. Posso assumir que sim e documentar essa exigência? Caso contrário, o front faz lookup adicional no Cloud por `modelo_id + codigo_linha` — mais lento, porém funciona.
