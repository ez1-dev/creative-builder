import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import type {
  OpcaoCentroRecurso,
  OpcaoEmpresa,
  OpcaoEstagio,
  OpcaoOp,
  OpcaoOrigem,
  OpcaoPedido,
  OpcaoProduto,
  OpcaoRelatorioProducao,
  OpcaoSituacao,
  OpcoesImpressao,
  OpcoesImpressaoParams,
} from "@/lib/producao/opcoesImpressao";

const isOri100 = (v: unknown) => String(v ?? "") === "100";
const isCancelada = (v: unknown) => String(v ?? "").toUpperCase() === "C";
const dropOri100Origens = (arr: OpcaoOrigem[] = []) =>
  arr.filter((o: any) => !isOri100(o?.cod_ori ?? o?.codigo ?? o?.value));
const dropOri100Ops = (arr: OpcaoOp[] = []) => arr.filter((o: any) => !isOri100(o?.cod_ori));
const dropCanceladas = (arr: OpcaoOp[] = []) => arr.filter((o: any) => !isCancelada(o?.sit_orp));
const dropSituacaoCancelada = (arr: OpcaoSituacao[] = []) => arr.filter((s: any) => !isCancelada(s?.sit_orp));
const sanitizeOps = (arr: OpcaoOp[] = []) => dropCanceladas(dropOri100Ops(arr));

export interface RefinementCtx {
  cod_cre?: string;
  cod_etg?: string;
  cod_pro?: string;
}

export interface SearchOpsContext extends RefinementCtx {
  cod_emp?: string;
  cod_ori?: string;
  num_ped?: string;
  rel_prd?: string;
  sit_orp?: string;
}

export function useOpcoesImpressaoOp() {
  const [empresas, setEmpresas] = useState<OpcaoEmpresa[]>([]);
  const [origens, setOrigens] = useState<OpcaoOrigem[]>([]);
  const [pedidos, setPedidos] = useState<OpcaoPedido[]>([]);
  const [relatoriosProducao, setRelatoriosProducao] = useState<OpcaoRelatorioProducao[]>([]);
  const [situacoes, setSituacoes] = useState<OpcaoSituacao[]>([]);
  const [ops, setOps] = useState<OpcaoOp[]>([]);
  const [estagios, setEstagios] = useState<OpcaoEstagio[]>([]);
  const [centrosRecurso, setCentrosRecurso] = useState<OpcaoCentroRecurso[]>([]);
  const [produtos, setProdutos] = useState<OpcaoProduto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOpcoes = useCallback(async (params: OpcoesImpressaoParams = {}) => {
    const q: Record<string, any> = {};
    if (params.cod_emp !== undefined && params.cod_emp !== "" && params.cod_emp !== null) {
      const n = Number(params.cod_emp);
      if (Number.isFinite(n)) q.cod_emp = n;
    }
    if (params.num_orp !== undefined && params.num_orp !== "" && params.num_orp !== null) {
      const n = Number(params.num_orp);
      if (Number.isFinite(n)) q.num_orp = n;
    }
    if (params.cod_ori && !isOri100(params.cod_ori)) q.cod_ori = params.cod_ori;
    if (params.cod_etg) q.cod_etg = params.cod_etg;
    if (params.cod_cre) q.cod_cre = params.cod_cre;
    if (params.cod_pro) q.cod_pro = params.cod_pro;
    if (params.num_ped) q.num_ped = params.num_ped;
    if (params.rel_prd) q.rel_prd = params.rel_prd;
    if (params.sit_orp && !isCancelada(params.sit_orp)) q.sit_orp = params.sit_orp;
    if (params.q) q.q = params.q;
    if (params.limite_ops !== undefined) q.limite_ops = params.limite_ops;
    return api.get<OpcoesImpressao>("/api/producao/ordem-producao/opcoes", q);
  }, []);

  const reloadBase = useCallback(
    async (cod_emp: string = "1") => {
      setLoading(true);
      try {
        const res = await fetchOpcoes({ cod_emp, limite_ops: 80 });
        setEmpresas(res.empresas ?? []);
        setOrigens(dropOri100Origens(res.origens ?? []));
        setPedidos(res.pedidos ?? []);
        setRelatoriosProducao(res.relatorios_producao ?? []);
        setSituacoes(dropSituacaoCancelada(res.situacoes ?? []));
        setOps(sanitizeOps(res.ordens_producao ?? []));
        setEstagios(res.estagios ?? []);
        setCentrosRecurso(res.centros_recurso ?? []);
        setProdutos(res.produtos ?? []);
      } finally {
        setLoading(false);
      }
    },
    [fetchOpcoes],
  );

  const reloadByPedido = useCallback(
    async (cod_emp: string, num_ped: string, sit_orp?: string, ref: RefinementCtx = {}) => {
      setLoading(true);
      try {
        const res = await fetchOpcoes({
          cod_emp,
          num_ped,
          sit_orp,
          cod_cre: ref.cod_cre,
          cod_etg: ref.cod_etg,
          cod_pro: ref.cod_pro,
          limite_ops: 200,
        });
        setOrigens(dropOri100Origens(res.origens ?? []));
        setOps(sanitizeOps(res.ordens_producao ?? []));
        if (res.produtos) setProdutos(res.produtos);
        if (!ref.cod_cre && !ref.cod_etg) {
          setEstagios(res.estagios ?? []);
          setCentrosRecurso(res.centros_recurso ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchOpcoes],
  );

  const reloadByRelatorio = useCallback(
    async (cod_emp: string, rel_prd: string, sit_orp?: string, ref: RefinementCtx = {}) => {
      setLoading(true);
      try {
        const res = await fetchOpcoes({
          cod_emp,
          rel_prd,
          sit_orp,
          cod_cre: ref.cod_cre,
          cod_etg: ref.cod_etg,
          cod_pro: ref.cod_pro,
          limite_ops: 500,
        });
        setOrigens(dropOri100Origens(res.origens ?? []));
        setOps(sanitizeOps(res.ordens_producao ?? []));
        if (res.produtos) setProdutos(res.produtos);
        if (!ref.cod_cre && !ref.cod_etg) {
          setEstagios(res.estagios ?? []);
          setCentrosRecurso(res.centros_recurso ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchOpcoes],
  );

  const reloadByOrigem = useCallback(
    async (
      cod_emp: string,
      cod_ori: string,
      ctx: { sit_orp?: string; num_ped?: string; rel_prd?: string; q?: string } & RefinementCtx = {},
    ) => {
      setLoading(true);
      try {
        const res = await fetchOpcoes({
          cod_emp,
          cod_ori,
          sit_orp: ctx.sit_orp,
          num_ped: ctx.num_ped,
          rel_prd: ctx.rel_prd,
          cod_cre: ctx.cod_cre,
          cod_etg: ctx.cod_etg,
          cod_pro: ctx.cod_pro,
          q: ctx.q,
          limite_ops: 200,
        });
        setOps(sanitizeOps(res.ordens_producao ?? []));
        if (res.produtos) setProdutos(res.produtos);
        if (!ctx.cod_cre && !ctx.cod_etg) {
          setEstagios(res.estagios ?? []);
          setCentrosRecurso(res.centros_recurso ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchOpcoes],
  );

  const reloadBySituacao = useCallback(
    async (
      cod_emp: string,
      sit_orp: string,
      ctx: { num_ped?: string; rel_prd?: string; cod_ori?: string } & RefinementCtx = {},
    ) => {
      setLoading(true);
      try {
        const res = await fetchOpcoes({
          cod_emp,
          sit_orp,
          num_ped: ctx.num_ped,
          rel_prd: ctx.rel_prd,
          cod_ori: ctx.cod_ori,
          cod_cre: ctx.cod_cre,
          cod_etg: ctx.cod_etg,
          cod_pro: ctx.cod_pro,
          limite_ops: 200,
        });
        setOrigens(dropOri100Origens(res.origens ?? []));
        setOps(sanitizeOps(res.ordens_producao ?? []));
        if (res.produtos) setProdutos(res.produtos);
      } finally {
        setLoading(false);
      }
    },
    [fetchOpcoes],
  );

  const reloadByCentroRecurso = useCallback(
    async (
      cod_emp: string,
      cod_cre: string,
      ctx: {
        cod_ori?: string;
        num_ped?: string;
        rel_prd?: string;
        sit_orp?: string;
        cod_etg?: string;
        cod_pro?: string;
        q?: string;
      } = {},
    ) => {
      setLoading(true);
      try {
        const res = await fetchOpcoes({
          cod_emp,
          cod_cre,
          cod_ori: ctx.cod_ori,
          num_ped: ctx.num_ped,
          rel_prd: ctx.rel_prd,
          sit_orp: ctx.sit_orp,
          cod_etg: ctx.cod_etg,
          cod_pro: ctx.cod_pro,
          q: ctx.q,
          limite_ops: 200,
        });
        setOps(sanitizeOps(res.ordens_producao ?? []));
        if (res.produtos) setProdutos(res.produtos);
      } finally {
        setLoading(false);
      }
    },
    [fetchOpcoes],
  );

  const reloadByProduto = useCallback(
    async (
      cod_emp: string,
      cod_pro: string,
      ctx: {
        cod_ori?: string;
        num_ped?: string;
        rel_prd?: string;
        sit_orp?: string;
        cod_cre?: string;
        cod_etg?: string;
      } = {},
    ) => {
      setLoading(true);
      try {
        const res = await fetchOpcoes({
          cod_emp,
          cod_pro,
          cod_ori: ctx.cod_ori,
          num_ped: ctx.num_ped,
          rel_prd: ctx.rel_prd,
          sit_orp: ctx.sit_orp,
          cod_cre: ctx.cod_cre,
          cod_etg: ctx.cod_etg,
          limite_ops: 200,
        });
        setOrigens(dropOri100Origens(res.origens ?? []));
        setOps(sanitizeOps(res.ordens_producao ?? []));
        if (res.produtos) setProdutos(res.produtos);
        if (!ctx.cod_cre && !ctx.cod_etg) {
          setEstagios(res.estagios ?? []);
          setCentrosRecurso(res.centros_recurso ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchOpcoes],
  );

  const reloadOpContexto = useCallback(
    async (cod_emp: string, cod_ori: string, num_orp: string) => {
      const res = await fetchOpcoes({ cod_emp, cod_ori, num_orp });
      setEstagios(res.estagios ?? []);
      setCentrosRecurso(res.centros_recurso ?? []);
    },
    [fetchOpcoes],
  );

  const reloadCres = useCallback(
    async (cod_emp: string, cod_ori: string, num_orp: string, cod_etg?: string) => {
      const res = await fetchOpcoes({ cod_emp, cod_ori, num_orp, cod_etg });
      setCentrosRecurso(res.centros_recurso ?? []);
    },
    [fetchOpcoes],
  );

  const searchOps = useCallback(
    async (q: string, ctx: SearchOpsContext = {}): Promise<OpcaoOp[]> => {
      const res = await fetchOpcoes({
        cod_emp: ctx.cod_emp,
        cod_ori: ctx.cod_ori,
        num_ped: ctx.num_ped,
        rel_prd: ctx.rel_prd,
        sit_orp: ctx.sit_orp,
        cod_cre: ctx.cod_cre,
        cod_etg: ctx.cod_etg,
        cod_pro: ctx.cod_pro,
        q,
        limite_ops: 200,
      });
      const list = sanitizeOps(res.ordens_producao ?? []);
      setOps(list);
      return list;
    },
    [fetchOpcoes],
  );

  const searchProdutos = useCallback(
    async (q: string, ctx: { cod_emp?: string } = {}): Promise<OpcaoProduto[]> => {
      const res = await fetchOpcoes({
        cod_emp: ctx.cod_emp,
        q: q || undefined,
        limite_ops: 200,
      });
      const list = res.produtos ?? [];
      setProdutos(list);
      return list;
    },
    [fetchOpcoes],
  );

  return {
    empresas,
    origens,
    pedidos,
    relatoriosProducao,
    situacoes,
    ops,
    estagios,
    centrosRecurso,
    produtos,
    loading,
    reloadBase,
    reloadByPedido,
    reloadByRelatorio,
    reloadByOrigem,
    reloadBySituacao,
    reloadByCentroRecurso,
    reloadByProduto,
    reloadOpContexto,
    reloadCres,
    searchOps,
    searchProdutos,
  };
}
