import { Navigate, useParams } from "react-router-dom";
export default function DreStudioModeloIndexPage() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/contabilidade/dre-studio/${id}/estrutura`} replace />;
}
