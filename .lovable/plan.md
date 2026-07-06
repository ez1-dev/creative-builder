# Botão "Relatório Gerencial (PDF + IA)" em cada página RH

Adicionar em cada uma das 6 páginas de RH um botão que gera um PDF gerencial focado no módulo daquela página, usando os filtros já selecionados na tela e a análise IA do módulo.

## Fluxo

1. Usuário está em qualquer página RH (ex.: `/rh/turnover`) com filtros/período já aplicados.
2. Clica em **Relatório PDF (IA)** no header da página.
3. O sistema:
   - Reusa o dashboard já carregado (evita nova chamada).
   - Para módulos com anomes (Folha, Turnover, Absenteísmo), busca o período anterior equivalente para comparativo.
   - Chama a edge function existente `rh-ai-insights` (`modulo` = `resumo-folha` | `quadro-colaboradores` | `contratos-experiencia` | `ferias` | `turnover` | `absenteismo`).
   - Renderiza PDF com `@react-pdf/renderer` e dispara download.
4. Nome do arquivo: `rh_<modulo>_${anomesIni}_${anomesFim}.pdf` (ou `${data}.pdf` para módulos sem período).

## Estrutura do PDF (por módulo)

```text
Capa compacta
  Título do módulo, período (se houver), filtros aplicados, data de geração

Página 1+  KPIs em cards (com delta vs período anterior quando aplicável)
           Tabelas principais do módulo (top proventos/descontos, top motivos, pivot férias etc.)
           Análise IA: diagnóstico, riscos, recomendações
Rodapé em todas as páginas
```

Conteúdo específico:
- **Resumo Folha**: KPIs (custo, líquido, HE, benef., INSS, FGTS) + Δ; top 10 proventos, top 10 descontos; série mensal.
- **Quadro Colaboradores**: total, distribuição por situação/filial/CC/cargo/sexo/faixa etária.
- **Contratos Experiência**: KPIs (ativos, a vencer 5/10, demitidos pós-exp) + lista de vencimentos críticos.
- **Programação Férias**: KPIs (vencidas, 30/60/90, em férias) + pivot ano×mês + amostra sem programação.
- **Turnover**: KPIs (taxa, admitidos, demitidos, saldo, headcount) + Δ; por mês; top motivos; por empresa.
- **Absenteísmo**: KPIs (taxa, dias, afastamentos, duração média) + Δ; por categoria; top motivos; por mês.

## Arquivos

**Novos**
- `src/components/rh/pdf/ModuloPdf.tsx` — documento react-pdf único que renderiza qualquer módulo via `switch(modulo)`; reusa `pdfStyles.ts` já criado.
- `src/components/rh/BotaoRelatorioModuloPdf.tsx` — botão reutilizável que:
  - Recebe props: `modulo`, `titulo`, `filtros` (opcional), `dadosAtuais` (já carregados), `carregarAnterior?()` opcional.
  - Faz `supabase.functions.invoke("rh-ai-insights", { modulo, payload })`.
  - Se `carregarAnterior` existir, chama em paralelo para obter dashboard anterior.
  - Renderiza `<ModuloPdf .../>` via `pdf(...).toBlob()` e dispara download.
  - Estados: loading, erro (toast); fallback: PDF sem seção IA se IA falhar.

**Editados** (adicionar o botão no header/toolbar de cada página)
- `src/pages/rh/ResumoFolhaPage.tsx`
- `src/pages/rh/QuadroColaboradoresPage.tsx`
- `src/pages/rh/ContratoExperienciaPage.tsx`
- `src/pages/rh/ProgramacaoFeriasPage.tsx`
- `src/pages/rh/TurnoverPage.tsx`
- `src/pages/rh/AbsenteismoPage.tsx`

## Detalhes técnicos

- Reusa `pdfStyles.ts`, `PDF_COLORS`, formatters e helpers já criados em `src/components/rh/pdf/`.
- Reusa `fetchers` existentes em `src/lib/rh/api.ts` para buscar período anterior (nenhum fetch novo ao ERP).
- Reusa a edge function existente `rh-ai-insights` (não cria nova função).
- Nada de consulta direta ao Supabase de negócio; tudo via `api` helper + gateway IA já configurado.
- Botão desabilitado enquanto o dashboard da página ainda não carregou.
- Regras de design tokens respeitadas (cores mapeadas para hex apenas dentro do PDF por limitação do renderer).
