import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMenuRh } from "@/lib/rh/api";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { Users, FileText, Calendar, Briefcase, Wallet, FileCheck } from "lucide-react";

const FALLBACK = [
  { codigo: "01", titulo: "Resumo Folha", rota: "/rh/resumo-folha", icon: Wallet },
  { codigo: "02", titulo: "Quadro Colaboradores", rota: "/rh/quadro-colaboradores", icon: Users },
  { codigo: "03", titulo: "Contrato Experiência", rota: "/rh/contrato-experiencia", icon: Briefcase },
  { codigo: "04", titulo: "Programação de Férias", rota: "/rh/programacao-ferias", icon: Calendar },
  { codigo: "99", titulo: "Formulários", rota: "/rh/formularios", icon: FileText },
];

const ROTA_POR_CODIGO: Record<string, string> = {
  "01": "/rh/resumo-folha",
  "02": "/rh/quadro-colaboradores",
  "03": "/rh/contrato-experiencia",
  "04": "/rh/programacao-ferias",
  "99": "/rh/formularios",
};

export default function RhIndexPage() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["rh", "menu"],
    queryFn: fetchMenuRh,
  });

  const items = (data && data.length ? data : FALLBACK).map((m: any) => ({
    ...m,
    rota: m.rota || ROTA_POR_CODIGO[m.codigo],
  }));

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="RH" subtitle="Gestão de Recursos Humanos" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
