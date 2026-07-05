import type { ColaboradorDetalhe } from "./quadroDashboardApi";

function norm(s: any) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isMasculino(x: ColaboradorDetalhe) {
  const s = norm(x.sexo);
  return s === "m" || s.includes("masculino");
}
export function isFeminino(x: ColaboradorDetalhe) {
  const s = norm(x.sexo);
  return s === "f" || s.includes("feminino");
}
export function isPCD(x: ColaboradorDetalhe) {
  const s = norm(x.pcd);
  return s === "s" || s === "sim" || s === "true" || s === "1";
}
export function isEstagiario(x: ColaboradorDetalhe) {
  return norm(x.vinculo).includes("estagi");
}
export function isAprendiz(x: ColaboradorDetalhe) {
  return norm(x.vinculo).includes("aprendiz");
}
function sitInclui(x: ColaboradorDetalhe, needle: string) {
  return norm(x.situacao).includes(norm(needle));
}

/** Retorna subset do detalhe para um KPI, ou null se não há filtro aplicável. */
export function filterDetalheByKpi(
  detalhe: ColaboradorDetalhe[],
  kpiKey: string,
): ColaboradorDetalhe[] | null {
  const d = detalhe ?? [];
  switch (kpiKey) {
    case "total":
      return d;
    case "masculino":
      return d.filter(isMasculino);
    case "feminino":
      return d.filter(isFeminino);
    case "pcd":
      return d.filter(isPCD);
    case "estagiarios":
      return d.filter(isEstagiario);
    case "jovem_aprendiz":
      return d.filter(isAprendiz);
    case "trabalhando":
      return d.filter((x) => sitInclui(x, "trabalhando") || sitInclui(x, "ativo"));
    case "ferias":
      return d.filter((x) => sitInclui(x, "ferias"));
    case "auxilio_doenca":
      return d.filter((x) => sitInclui(x, "auxilio doenca") || sitInclui(x, "aux doenca"));
    case "acidente":
      return d.filter((x) => sitInclui(x, "acidente"));
    case "licenca_maternidade":
      return d.filter((x) => sitInclui(x, "maternidade"));
    case "aposentadoria":
      return d.filter((x) => sitInclui(x, "aposent"));
    default:
      return null;
  }
}

/** Filtra por valor "cru" de uma dimensão do detalhe (ex.: empresa === "GENIUS"). */
export function filterDetalheByDimensao(
  detalhe: ColaboradorDetalhe[],
  chave: string,
  valor: string,
): ColaboradorDetalhe[] {
  const alvo = norm(valor);
  return (detalhe ?? []).filter((x) => norm((x as any)[chave]) === alvo);
}

/** Para o card "Sexo" (labels vêm normalizados como "Masculino"/"Feminino"). */
export function filterDetalheBySexoLabel(
  detalhe: ColaboradorDetalhe[],
  label: string,
): ColaboradorDetalhe[] {
  const n = norm(label);
  if (n.startsWith("m")) return detalhe.filter(isMasculino);
  if (n.startsWith("f")) return detalhe.filter(isFeminino);
  return filterDetalheByDimensao(detalhe, "sexo", label);
}
