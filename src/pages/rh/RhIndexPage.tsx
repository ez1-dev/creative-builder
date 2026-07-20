import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMenuRh } from "@/lib/rh/api";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { Users, FileText, Calendar, Briefcase, Wallet, FileCheck, TrendingUp, Activity, Sparkles } from "lucide-react";

const FALLBACK = [
  { codigo: "01", titulo: "Resumo Folha", rota: "/rh/resumo-folha", icon: Wallet },
  { codigo: "02", titulo: "Quadro Colaboradores", rota: "/rh/quadro-colaboradores", icon: Users },
  { codigo: "03", titulo: "Contrato Experiência", rota: "/rh/contrato-experiencia", icon: Briefcase },
  { codigo: "04", titulo: "Programação de Férias", rota: "/rh/programacao-ferias", icon: Calendar },
  { codigo: "05", titulo: "Rotatividade / Turnover", rota: "/rh/turnover", icon: TrendingUp },
  { codigo: "06", titulo: "Absenteísmo / Afastamentos", rota: "/rh/absenteismo", icon: Activity },
  { codigo: "97", titulo: "Relatório Gerencial (PDF + IA)", rota: "/rh/relatorio-gerencial", icon: Sparkles, descricao: "Consolida os 6 módulos em um PDF executivo com análise de IA e alertas priorizados." },
  { codigo: "99", titulo: "Formulários", rota: "/rh/formularios", icon: FileText },
];

const ROTA_POR_CODIGO: Record<string, string> = {
  "01": "/rh/resumo-folha",
  "02": "/rh/quadro-colaboradores",
  "03": "/rh/contrato-experiencia",
  "04": "/rh/programacao-ferias",
  "05": "/rh/turnover",
  "06": "/rh/absenteismo",
  "97": "/rh/relatorio-gerencial",
  "99": "/rh/formularios",
};


export default function RhIndexPage() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["rh", "menu"],
    queryFn: fetchMenuRh,
  });

  const backendByCodigo = new Map<string, any>();
  for (const it of (data ?? []) as any[]) {
    if (it && it.codigo) backendByCodigo.set(String(it.codigo), it);
  }
  const merged: any[] = FALLBACK.map((fb) => {
    const b = backendByCodigo.get(fb.codigo) ?? {};
    backendByCodigo.delete(fb.codigo);
    return {
      ...fb,
      ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined && v !== null && v !== "")),
      codigo: fb.codigo,
      titulo: (b.titulo && String(b.titulo).trim()) || fb.titulo,
      descricao: b.descricao ?? (fb as any).descricao,
      rota: b.rota || fb.rota || ROTA_POR_CODIGO[fb.codigo],
    };
  });
  for (const b of backendByCodigo.values()) {
    merged.push({
      ...b,
      titulo: (b.titulo && String(b.titulo).trim()) || `Módulo ${b.codigo}`,
      rota: b.rota || ROTA_POR_CODIGO[b.codigo],
    });
  }
  const items = merged;


  return (
    <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
      <RhPageHeader title="Recursos Humanos" subtitle="Painéis, indicadores e gestão de pessoas" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">

        {items.map((m: any) => {
          const Fb = FALLBACK.find((f) => f.codigo === m.codigo);
          const Icon = (Fb?.icon ?? FileCheck) as any;
          return (
            <Card
              key={m.codigo}
              className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
              onClick={() => m.rota && navigate(m.rota)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">{m.codigo}</span>
                  <span>{m.titulo}</span>
                </CardTitle>
              </CardHeader>
              {m.descricao && <CardContent className="text-sm text-muted-foreground">{m.descricao}</CardContent>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
