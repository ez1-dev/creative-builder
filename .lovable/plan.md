## Objetivo

Adicionar gestão de De-Para de siglas/processos do ERP Senior Nativo dentro da aba "ERP Nativo" da página `/monitor-telas`, consumindo `GET/POST {API_BASE}/api/telemetria-nativa/depara`.

## Arquivos

**Novos**
- `src/lib/telemetriaNativaDeparaApi.ts` — client tipado para `GET /api/telemetria-nativa/depara` e `POST /api/telemetria-nativa/depara`. Reaproveita o helper de fetch autenticado já usado em `navegacaoTelemetriaApi.ts` (Bearer token + tratamento de statusCode).
- `src/components/monitor-telas/DeParaTelasModal.tsx` — Dialog (shadcn) grande com duas seções (Tabs internas: "A mapear" | "Mapeadas"), tabelas editáveis inline, badges, skeletons, toasts (sonner), tratamento de erros 401/geral e estados vazios.

**Editados**
- `src/components/monitor-telas/MonitorTelasTab.tsx` — quando `origem === 'nativo'`, renderizar botão "De-Para de Telas" no topo (canto superior direito, acima dos KPIs, próximo ao card de Análise IA). Botão abre `DeParaTelasModal`. Ao fechar após um salvamento bem-sucedido, incrementar um contador interno que dispara `load()` para atualizar resumo/ranking/por-dia/nao-utilizadas.

Nada muda na aba Portal Web, nem nos filtros globais em `MonitorTelasPage.tsx`.

## Detalhes técnicos

### Client (`telemetriaNativaDeparaApi.ts`)

```ts
export interface DeParaMapeada {
  sig_processo: string;
  nome_tela: string | null;
  modulo: string | null;
  ativo: boolean;
  obs: string | null;
}
export interface DeParaNaoMapeada {
  sig_processo: string;
  acessos: number | null;
  ultimo_acesso: string | null;
}
export interface DeParaResponse {
  mapeadas: DeParaMapeada[];
  nao_mapeadas: DeParaNaoMapeada[];
}
export interface DeParaUpsertInput {
  sig_processo: string;
  nome_tela: string;
  modulo: string;
  ativo: boolean;
  obs?: string;
}
export function fetchDeParaTelas(): Promise<DeParaResponse>;
export function upsertDeParaTela(input: DeParaUpsertInput): Promise<void>;
```

Usa a mesma base `API_BASE` e mesmo cabeçalho `Authorization: Bearer <token>` do restante do módulo. Sem mocks.

### Modal (`DeParaTelasModal.tsx`)

Props: `{ open, onOpenChange, onSaved }`. Ao abrir (open=true) chama `fetchDeParaTelas()`.

Layout:
- `<Dialog>` com `max-w-5xl`.
- Título: "De-Para de Telas Senior". Subtítulo conforme spec.
- `<Tabs>` internas: `a-mapear` (default) e `mapeadas`, com contadores nos labels.
- Loading: `<Skeleton>` grid dentro do body.
- Erros: `<Alert variant="destructive">` (401 → "Sessão expirada..."; outros → "Não foi possível carregar o de-para de telas.").

Aba "A mapear":
- Ordenar `nao_mapeadas` por `acessos` desc.
- Tabela: Sigla (badge "Pendente" ao lado, destaque visual para os 3 primeiros por acessos), Acessos, Último Acesso (via `formatDateTimeBR`), Nome da Tela (`<Input>`), Módulo (`<Input>`), Obs (`<Input>` opcional), Ação (`<Button>` Salvar).
- Botão Salvar `disabled` até que `nome_tela` e `modulo` estejam preenchidos (validação client-side).
- Ao salvar: `POST` com `ativo: true`, `toast.success`, recarrega `GET /depara` e seta flag `savedAny=true`.
- Vazio: "Não há novas siglas para mapear."

Aba "Mapeadas":
- Tabela com Sigla, Nome da Tela (editável), Módulo (editável), Ativo (`<Switch>`), Obs (editável), Ação (Salvar).
- Badge "Mapeada" (verde) quando `ativo`, "Inativa" (cinza) quando `!ativo`.
- Ao salvar: `POST` com os valores atuais, mesmo tratamento (toast + reload).
- Vazio: "Nenhum de-para cadastrado ainda."

Fechamento:
- `onOpenChange(false)` chama `onSaved()` se `savedAny` for true, para o pai recarregar os blocos da aba.

### Integração em `MonitorTelasTab.tsx`

- Novo state `deParaOpen: boolean`.
- Bloco condicional `{origem === 'nativo' && (...)}` renderiza uma barra fina acima dos KPIs com `<Button variant="outline">De-Para de Telas</Button>` alinhado à direita.
- `<DeParaTelasModal open={deParaOpen} onOpenChange={setDeParaOpen} onSaved={load} />`.
- Ranking e Não Utilizadas continuam usando o fallback já existente (`nomeTela` retorna `sig_processo` / "Processo XXX" quando `nome_tela` é nulo). Adicionar apenas fallback de módulo `"Não mapeado"` na renderização das duas tabelas quando `origem === 'nativo'` e `r.modulo` for null/vazio.
- Modal de histórico (`HistoricoTelaModal`) já é o consumidor de `/eventos`; nenhuma mudança adicional necessária além de continuar exibindo `sig_processo` quando não houver `nome_tela` (já é o comportamento atual).

## Critérios de aceite mapeados

1. Botão só na aba ERP Nativo — condicional por `origem`.
2. `GET /depara` chamado ao abrir o modal.
3. Seção "A mapear" lista `nao_mapeadas` ordenadas por acessos.
4. Seção "Mapeadas" lista `mapeadas` com badges Mapeada/Inativa.
5. Salvar sigla pendente via `POST` com `ativo: true`.
6. Editar mapeada via mesmo `POST`.
7. `onSaved` recarrega resumo/ranking/por-dia/nao-utilizadas ao fechar o modal.
8. Sem mocks — todos os dados vêm dos endpoints reais.
9. Aba ERP Nativo sem logs continua funcionando; o botão abre o modal mesmo sem dados de telemetria.

## Fora de escopo

- Alterações na aba Portal Web.
- Novos endpoints/tabelas no Lovable Cloud (o de-para vive na API 8070).
- Exclusão de mapeamentos (não há endpoint DELETE listado; inativar via `ativo=false` cobre o caso).
