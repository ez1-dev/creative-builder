import { Button } from '@/components/ui/button';
import { Tv } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * Botão "Modo TV" — abre a rota atual com `?tv=1` em nova aba,
 * ativando o layout wallboard (sem sidebar/header) com auto-refresh.
 */
export function TvModeButton({ className }: { className?: string }) {
  const location = useLocation();

  const handleClick = () => {
    const params = new URLSearchParams(location.search);
    params.set('tv', '1');
    const url = `${location.pathname}?${params.toString()}${location.hash}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      className={className}
      title="Abrir em modo TV / Mural (?tv=1)"
    >
      <Tv className="h-4 w-4 mr-1.5" />
      Modo TV
    </Button>
  );
}
