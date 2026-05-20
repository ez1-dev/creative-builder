import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type {
  OpcaoCentroRecurso,
  OpcaoEmpresa,
  OpcaoEstagio,
  OpcaoOp,
  OpcaoOrigem,
  OpcaoPedido,
  OpcaoRelatorioProducao,
  OpcoesImpressao,
  OpcoesImpressaoParams,
} from '@/lib/producao/opcoesImpressao';

const isOri100 = (v: unknown) => String(v ?? '') === '100';
const dropOri100Origens = (arr: OpcaoOrigem[] = []) =>
  arr.filter((o: any) => !isOri100(o?.cod_ori ?? o?.codigo ?? o?.value));
const dropOri100Ops = (arr: OpcaoOp[] = []) =>
  arr.filter((o: any) => !isOri100(o?.cod_ori));

export interface SearchOpsContext {
  cod_emp?: string;
  num_ped?: string;
  rel_prd?: string;
}

export function useOpcoesImpressaoOp() {
  const [empresas, setEmpresas] = useState<OpcaoEmpresa[]>([]);
  const [origens, setOrigens] = useState<OpcaoOrigem[]>([]);
  const [pedidos, setPedidos] = useState<OpcaoPedido[]>([]);
  const [relatoriosProducao, setRelatoriosProducao] = useState<OpcaoRelatorioProducao[]>([]);
  const [ops, setOps] = useState<OpcaoOp[]>([]);
  const [estagios, setEstagios] = useState<OpcaoEstagio[]>([]);
  const [centrosRecurso, setCentrosRecurso] = useState<OpcaoCentroRecurso[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOpcoes = useCallback(async (params: OpcoesImpressaoParams = {}) => {
    const q: Record<string, any> = {};
    if (params.cod_emp !== undefined && params.cod_emp !== '' && params.cod_emp !== null) {
      const n = Number(params.cod_emp);
      if (Number.isFinite(n)) q.cod_emp = n;
    }
    if (params.num_orp !== undefined && params.num_orp !== '' && params.num_orp !== null) {
      const n = Number(params.num_orp);
      if (Number.isFinite(n)) q.num_orp = n;
    }
    if (params.cod_ori && !isOri100(params.cod_ori)) q.cod_ori = params.cod_ori;
    if (params.cod_etg) q.cod_etg = params.cod_etg;
    if (params.cod_cre) q.cod_cre = params.cod_cre;
    if (params.num_ped) q.num_ped = params.num_ped;
    if (params.rel_prd) q.rel_prd = params.rel_prd;
    if (params.q) q.q = params.q;
    if (params.limite_ops !== undefined) q.limite_ops = params.limite_ops;
    return api.get<OpcoesImpressao>('/api/producao/ordem-producao/opcoes', q);
  }, []);

  const reloadBase = useCallback(async (cod_emp: string = '1') => {
    setLoading(true);
    try {
      const res = await fetchOpcoes({ cod_emp, limite_ops: 80 });
      setEmpresas(res.empresas ?? []);
      setOrigens(dropOri100Origens(res.origens ?? []));
      setPedidos(res.pedidos ?? []);
      setRelatoriosProducao(res.relatorios_producao ?? []);
      setOps(dropOri100Ops(res.ordens_producao ?? []));
      setEstagios(res.estagios ?? []);
      setCentrosRecurso(res.centros_recurso ?? []);
    } finally {
      setLoading(false);
    }
  }, [fetchOpcoes]);

  const reloadByPedido = useCallback(async (cod_emp: string, num_ped: string) => {
    const res = await fetchOpcoes({ cod_emp, num_ped, limite_ops: 80 });
    setOrigens(dropOri100Origens(res.origens ?? []));
    setOps(dropOri100Ops(res.ordens_producao ?? []));
    setEstagios(res.estagios ?? []);
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const reloadByRelatorio = useCallback(async (cod_emp: string, rel_prd: string) => {
    const res = await fetchOpcoes({ cod_emp, rel_prd, limite_ops: 80 });
    setOrigens(dropOri100Origens(res.origens ?? []));
    setOps(dropOri100Ops(res.ordens_producao ?? []));
    setEstagios(res.estagios ?? []);
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const reloadOpContexto = useCallback(async (cod_emp: string, cod_ori: string, num_orp: string) => {
    const res = await fetchOpcoes({ cod_emp, cod_ori, num_orp });
    setEstagios(res.estagios ?? []);
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const reloadCres = useCallback(async (cod_emp: string, cod_ori: string, num_orp: string, cod_etg?: string) => {
    const res = await fetchOpcoes({ cod_emp, cod_ori, num_orp, cod_etg });
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const searchOps = useCallback(async (q: string, ctx: SearchOpsContext = {}): Promise<OpcaoOp[]> => {
    const res = await fetchOpcoes({
      cod_emp: ctx.cod_emp,
      num_ped: ctx.num_ped,
      rel_prd: ctx.rel_prd,
      q,
      limite_ops: 80,
    });
    const list = dropOri100Ops(res.ordens_producao ?? []);
    setOps(list);
    return list;
  }, [fetchOpcoes]);

  return {
    empresas, origens, pedidos, relatoriosProducao, ops, estagios, centrosRecurso, loading,
    reloadBase, reloadByPedido, reloadByRelatorio, reloadOpContexto, reloadCres, searchOps,
  };
}
