import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type {
  OpcaoCentroRecurso,
  OpcaoEmpresa,
  OpcaoEstagio,
  OpcaoOp,
  OpcaoOrigem,
  OpcoesImpressao,
  OpcoesImpressaoParams,
} from '@/lib/producao/opcoesImpressao';

export function useOpcoesImpressaoOp() {
  const [empresas, setEmpresas] = useState<OpcaoEmpresa[]>([]);
  const [origens, setOrigens] = useState<OpcaoOrigem[]>([]);
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
    if (params.cod_ori) q.cod_ori = params.cod_ori;
    if (params.cod_etg) q.cod_etg = params.cod_etg;
    if (params.cod_cre) q.cod_cre = params.cod_cre;
    if (params.q) q.q = params.q;
    if (params.limite_ops !== undefined) q.limite_ops = params.limite_ops;
    return api.get<OpcoesImpressao>('/api/producao/ordem-producao/opcoes', q);
  }, []);

  const reloadBase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOpcoes({ limite_ops: 80 });
      setEmpresas(res.empresas ?? []);
      setOrigens(res.origens ?? []);
      setOps(res.ordens_producao ?? []);
      setEstagios(res.estagios ?? []);
      setCentrosRecurso(res.centros_recurso ?? []);
    } finally {
      setLoading(false);
    }
  }, [fetchOpcoes]);

  const reloadByEmpresa = useCallback(async (cod_emp: string) => {
    const res = await fetchOpcoes({ cod_emp, limite_ops: 80 });
    setOrigens(res.origens ?? []);
    setOps(res.ordens_producao ?? []);
    setEstagios(res.estagios ?? []);
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const reloadByOrigem = useCallback(async (cod_emp: string, cod_ori: string) => {
    const res = await fetchOpcoes({ cod_emp, cod_ori, limite_ops: 80 });
    setOps(res.ordens_producao ?? []);
    setEstagios(res.estagios ?? []);
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const reloadEstagios = useCallback(async (cod_emp: string, cod_ori: string, num_orp: string) => {
    const res = await fetchOpcoes({ cod_emp, cod_ori, num_orp });
    setEstagios(res.estagios ?? []);
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const reloadCres = useCallback(async (cod_emp: string, cod_ori: string, num_orp: string, cod_etg?: string) => {
    const res = await fetchOpcoes({ cod_emp, cod_ori, num_orp, cod_etg });
    setCentrosRecurso(res.centros_recurso ?? []);
  }, [fetchOpcoes]);

  const searchOps = useCallback(async (q: string, cod_emp?: string, cod_ori?: string): Promise<OpcaoOp[]> => {
    const res = await fetchOpcoes({ cod_emp, cod_ori, q, limite_ops: 80 });
    const list = res.ordens_producao ?? [];
    setOps(list);
    return list;
  }, [fetchOpcoes]);

  return {
    empresas, origens, ops, estagios, centrosRecurso, loading,
    reloadBase, reloadByEmpresa, reloadByOrigem, reloadEstagios, reloadCres, searchOps,
  };
}
