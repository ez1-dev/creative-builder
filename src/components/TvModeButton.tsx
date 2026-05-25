import { Button } from '@/components/ui/button';
import { Tv, TvMinimal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTvMode } from '@/hooks/useTvMode';
import { useUserPermissions } from '@/hooks/useUserPermissions';

/**
 * Botão "Modo TV" — abre a rota atual com `?tv=1` em nova aba,
 * ativando o layout wallboard (sem sidebar/header) com auto-refresh.
 * Quando já está em modo TV, vira "Sair do Modo TV" e retorna ao layout normal.
 */
export function TvModeButton({ className }: { className?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { tvMode } = useTvMode();

  const handleClick = () => {
    const params = new URLSearchParams(location.search);
    if (tvMode) {
      params.delete('tv');
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? '?' + qs : ''}${location.hash}`, { replace: true });
      return;
    }
    params.set('tv', '1');
    const url = `${location.pathname}?${params.toString()}${location.hash}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={tvMode ? 'default' : 'outline'}
      onClick={handleClick}
      className={className}
      title={tvMode ? 'Voltar ao layout normal' : 'Abrir em modo TV / Mural (?tv=1)'}
    >
      {tvMode ? <TvMinimal className="h-4 w-4 mr-1.5" /> : <Tv className="h-4 w-4 mr-1.5" />}
      {tvMode ? 'Sair Modo TV' : 'Modo TV'}
    </Button>
  );
}
