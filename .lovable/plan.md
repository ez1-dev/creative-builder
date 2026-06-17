# DRE Dinâmica Gerencial

Nova página que consome o endpoint `GET /api/bi/contabilidade/dre-dinamica` e reusa a infraestrutura de configuração já criada (tabelas `bi_dre_modelos`, `bi_dre_estrutura_v2`, `bi_dre_linha_regra`).

## Observação sobre nomes de tabela

O pedido cita `bi_dre_modelo` e `bi_dre_linha` (singular). No Cloud já existem, com o mesmo papel:
- `bi_dre_modelos` (modelos/versões)
- `bi_dre_estrutura_v2` (linhas da DRE com todas as flags pedidas: `tipo_linha`, `formula`, `flag_inverte_sinal`, `flag_exibe_dre`, `flag_permite_drill`, `flag_negrito`, `flag_totalizadora`, `ativo`)
- `bi_dre_linha_regra` (regras — já no nome certo)

O plano usa as tabelas existentes (sem criar duplicatas). O backend FastAPI deve usar as mesmas tabelas ao montar `/dre-dinamica`.

## 1. Frontend — Página de visualização

Arquivo novo: `src/pages/bi/contabilidade/DreDinamicaPage.tsx`
Rota: `/bi/contabilidade/dre-dinamica` (adicionar em `App.tsx`, `AppSidebar.tsx` e `screenCatalog.ts`).

Filtros no topo:
- Ano (select, default ano corrente)
- Mês inicial (1–12)
- Mês final (1–12, default = mês corrente)
- Modelo da DRE (carregado de `bi_dre_modelos` via Supabase; default = publicado mais recente; opção "Padrão (sem modelo)" envia sem `modelo_id`)
- Botão **Recalcular DRE** (refetch sem reload)

Montagem dos params:
```
anomes_ini = `${ano}${mes_ini.padStart(2,'0')}`
anomes_fim = `${ano}${mes_fim.padStart(2,'0')}`
```
Validação: `mes_fim >= mes_ini`. Nunca enviar descrição visual; só códigos técnicos.

Logs obrigatórios antes do fetch:
```
console.log("[DRE DINAMICA] filtros:", filtros);
console.log("[DRE DINAMICA] url:", url);
console.log("[DRE DINAMICA] retorno:", data);
```

Tabela de exibição:
- Colunas: Descrição, Tipo, Realizado
- Ordenação por `ordem`
- Indentação à esquerda = `(nivel - 1) * 16px`
- Negrito quando `tipo_linha ∈ {CALCULO, TOTAL}` ou `flag_negrito = true` (se vier no retorno)
- Valores formatados em BRL (`Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`); negativos com sinal `-`
- Drill: ícone na linha quando `flag_permite_drill !== false`, reusando `DreDrillDrawer` existente

Diagnóstico:
- `dados.length === 0` → alerta amarelo:
  "Nenhuma linha retornada. Verifique se existe modelo ativo, linhas ativas e regras cadastradas."
- `realizado === 0` → exibe normalmente (R$ 0,00); não tratar como erro

## 2. Cliente API

Arquivo novo: `src/lib/bi/dreDinamicaApi.ts`
```ts
export interface DreDinamicaLinha {
  modelo_id: string | null;
  codigo_linha: string;
  descricao: string;
  ordem: number;
  nivel: number;
  tipo_linha: "TITULO"|"ANALITICA"|"AGRUPADORA"|"TOTAL"|"CALCULO";
  formula: string | null;
  realizado: number;
  flag_negrito?: boolean;
  flag_permite_drill?: boolean;
}
export interface DreDinamicaResponse {
  anomes_ini: string; anomes_fim: string;
  modelo_id: string | null; dados: DreDinamicaLinha[];
}
export async function fetchDreDinamica(p: {
  anomes_ini: string; anomes_fim: string; modelo_id?: string | null;
}): Promise<DreDinamicaResponse>
```
- Usa `apiFetch` padrão do projeto (FastAPI via ngrok, header `ngrok-skip-browser-warning: true`, Bearer token).
- Inclui os três `console.log` exigidos.

## 3. Configuração da DRE (4 abas)

Reaproveitar `DreConfiguracaoPage.tsx` já existente e estender. Cada aba é arquivo separado em `src/components/bi/contabilidade/configuracao/`.

### Aba Modelos (nova: `ModelosTab.tsx`)
- Lista `bi_dre_modelos` (versao, status, descrição, publicado_em)
- Criar rascunho, duplicar de publicado, marcar como publicado, arquivar
- Audit em `bi_dre_auditoria`

### Aba Linhas (`EstruturaTreeTab.tsx` já existe — ajustar)
- Listar `bi_dre_estrutura_v2` do modelo selecionado, ordenado por `ordem`
- Campos editáveis: codigo_linha, descricao, ordem, nivel, tipo_linha, formula, ativo, flag_inverte_sinal, flag_exibe_dre, flag_permite_drill, flag_negrito, flag_totalizadora
- Criar / editar / inativar (`ativo = false`). **Nunca DELETE físico.**
- Validação: `codigo_linha` em `UPPER_SNAKE`, único por modelo

### Aba Regras (`RegrasLinhaTab.tsx` já existe — ajustar)
- Selecionar uma linha → lista regras de `bi_dre_linha_regra`
- Campos do formulário: tipo_regra, operador, cd_mascara, cd_conta_contabil, cd_centro_custos, cd_centro_custos_3, cd_origem_lcto, cd_tns, ds_historico, sinal (1/-1), prioridade, ativo
- Tipos: `MASCARA_CONTA | CONTA_CONTABIL | CENTRO_CUSTOS | CENTRO_CUSTOS_3 | ORIGEM | TRANSACAO | HISTORICO`
- Operadores: `COMECA_COM | IGUAL | CONTEM`
- UI mostra apenas o campo "principal" relevante por `tipo_regra` (máscara→cd_mascara, conta→cd_conta_contabil, transação→cd_tns, histórico→ds_historico) + campos opcionais como avançado

### Aba Plano de Contas (nova: `PlanoContasTab.tsx` — substitui mock do `ContasErpTab`)
- Query agregada em `bi_vm_lanc_contabil`:
  ```sql
  select cd_mascara, cd_mascara_1, cd_mascara_2, cd_mascara_3, cd_mascara_4,
         cd_conta_contabil, count(*) qtde, sum(coalesce(vl_saldo, vl_credito - vl_debito)) total
  from bi_vm_lanc_contabil
  group by 1,2,3,4,5,6
  ```
  Exposta via Supabase RPC `get_plano_contas_dre()` (security definer, GRANT to authenticated) — incluída na migration.
- Tabela com multi-seleção
- Filtro por nível de máscara
- Botão **Vincular à linha selecionada** (precisa de linha ativa na aba Linhas):
  - Para cada item selecionado:
    - se máscara → tipo_regra=`MASCARA_CONTA`, operador=`COMECA_COM`, cd_mascara preenchido
    - se conta contábil → tipo_regra=`CONTA_CONTABIL`, operador=`IGUAL`, cd_conta_contabil preenchido
  - Escolha de `sinal` (1/-1) num radio no rodapé
  - `ativo = true`, `prioridade` auto-incrementada
  - Audit em `bi_dre_auditoria`

## 4. Migration (mínima)

```sql
create or replace function public.get_plano_contas_dre()
returns table(cd_mascara text, cd_mascara_1 text, cd_mascara_2 text,
              cd_mascara_3 text, cd_mascara_4 text, cd_conta_contabil text,
              qtde bigint, total numeric)
language sql stable security definer set search_path = public as $$
  select ... from bi_vm_lanc_contabil group by ...
$$;
grant execute on function public.get_plano_contas_dre() to authenticated;
```

## 5. Documentação backend

`docs/backend-bi-contabilidade-dre-dinamica.md` — contrato do endpoint, exemplo de request/response, regras de avaliação (sinal, agregação por modelo, fórmulas, indentação, ordem).

## Fora de escopo
- Drill-down novo (reusa `DreDrillDrawer` atual)
- Parser de fórmulas server-side (responsabilidade do FastAPI)
- Renomear tabelas para o nome singular pedido

## Confirmações pedidas
1. OK usar `bi_dre_modelos` / `bi_dre_estrutura_v2` (existentes) em vez de criar `bi_dre_modelo` / `bi_dre_linha` no singular?
2. O endpoint `/api/bi/contabilidade/dre-dinamica` já existe no FastAPI ou devo deixar a tela funcionando mesmo que o backend ainda retorne 404 (com mensagem de diagnóstico)?
