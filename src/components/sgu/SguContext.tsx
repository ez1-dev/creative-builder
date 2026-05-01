import { createContext, useContext, useState, ReactNode } from 'react';
import type { SguUsuario, PreviewCamposResultado, CompararResultado } from '@/lib/sguApi';

interface SguContextValue {
  usuarioOrigem: SguUsuario | null;
  usuarioDestino: SguUsuario | null;
  setUsuarioOrigem: (u: SguUsuario | null) => void;
  setUsuarioDestino: (u: SguUsuario | null) => void;
  comparacao: CompararResultado | null;
  setComparacao: (c: CompararResultado | null) => void;
  preview: PreviewCamposResultado | null;
  setPreview: (p: PreviewCamposResultado | null) => void;
  mostrarCamposIguais: boolean;
  setMostrarCamposIguais: (b: boolean) => void;
}

const SguContext = createContext<SguContextValue | null>(null);

export function SguProvider({ children }: { children: ReactNode }) {
  const [usuarioOrigem, setUsuarioOrigem] = useState<SguUsuario | null>(null);
  const [usuarioDestino, setUsuarioDestino] = useState<SguUsuario | null>(null);
  const [comparacao, setComparacao] = useState<CompararResultado | null>(null);
  const [preview, setPreview] = useState<PreviewCamposResultado | null>(null);
  const [mostrarCamposIguais, setMostrarCamposIguais] = useState(false);

  return (
    <SguContext.Provider
      value={{
        usuarioOrigem,
        usuarioDestino,
        setUsuarioOrigem,
        setUsuarioDestino,
        comparacao,
        setComparacao,
        preview,
        setPreview,
        mostrarCamposIguais,
        setMostrarCamposIguais,
      }}
    >
      {children}
    </SguContext.Provider>
  );
}

export function useSgu() {
  const ctx = useContext(SguContext);
  if (!ctx) throw new Error('useSgu deve ser usado dentro de SguProvider');
  return ctx;
}
