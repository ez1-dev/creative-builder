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
    return api.get<OpcoesImpressao>('/api/producao/ordem-producao/opcoes', params as any);
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
