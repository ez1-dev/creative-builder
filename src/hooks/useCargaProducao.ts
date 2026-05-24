import { useQuery } from '@tanstack/react-query';
import { cargaApi, CargaFiltros } from '@/lib/producao/cargaApi';

export function useCargaCentros(filtros: CargaFiltros, enabled = true) {
  return useQuery({
    queryKey: ['carga-producao', 'centros', filtros],
    queryFn: () => cargaApi.centros(filtros),
    enabled,
    staleTime: 30_000,
  });
}

export function useCargaDetalhe(filtros: CargaFiltros & { pagina?: number; tamanho_pagina?: number }, enabled = true) {
  return useQuery({
    queryKey: ['carga-producao', 'detalhe', filtros],
    queryFn: () => cargaApi.detalhe(filtros),
    enabled,
    staleTime: 30_000,
  });
}

export function useCargaOpcoes(codemp?: number) {
  return useQuery({
    queryKey: ['carga-producao', 'opcoes', codemp],
    queryFn: () => cargaApi.opcoes(codemp),
    staleTime: 5 * 60_000,
  });
}

export function useParametrosRecursos() {
  return useQuery({
    queryKey: ['carga-producao', 'parametros-recursos'],
    queryFn: () => cargaApi.listarParametros(),
    staleTime: 60_000,
  });
}
