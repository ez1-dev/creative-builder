import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, MapPin, Locate } from 'lucide-react';

const timezoneMap: Record<string, string> = {
  'America/Sao_Paulo': 'São Paulo, BR',
  'America/Rio_Branco': 'Rio Branco, BR',
  'America/Manaus': 'Manaus, BR',
  'America/Belem': 'Belém, BR',
  'America/Fortaleza': 'Fortaleza, BR',
  'America/Recife': 'Recife, BR',
  'America/Bahia': 'Salvador, BR',
  'America/Cuiaba': 'Cuiabá, BR',
  'America/Campo_Grande': 'Campo Grande, BR',
  'America/Porto_Velho': 'Porto Velho, BR',
  'America/Boa_Vista': 'Boa Vista, BR',
  'America/Noronha': 'Noronha, BR',
  'America/Araguaina': 'Araguaína, BR',
  'America/Maceio': 'Maceió, BR',
};

const CACHE_KEY = 'header_user_location';

function getTimezoneFallback(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezoneMap[tz]) return timezoneMap[tz];
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

export function HeaderInfo() {
  const [now, setNow] = useState(() => new Date());
  const timezoneFallback = useMemo(getTimezoneFallback, []);
  const [location, setLocation] = useState<string>(() => {
    try {
      return localStorage.getItem(CACHE_KEY) || timezoneFallback;
    } catch {
      return timezoneFallback;
    }
  });
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation || resolving) return;
    setResolving(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
          );
          if (!res.ok) throw new Error('geocode failed');
          const json = await res.json();
          const city = json.city || json.locality || '';
          const state = json.principalSubdivisionCode?.replace('BR-', '') || '';
          const resolved = city ? (state ? `${city}, ${state}` : city) : timezoneFallback;
          setLocation(resolved);
          try { localStorage.setItem(CACHE_KEY, resolved); } catch {}
        } catch {
          setLocation(timezoneFallback);
        } finally {
          setResolving(false);
        }
      },
      () => {
        setLocation(timezoneFallback);
        setResolving(false);
      },
      { timeout: 5000, maximumAge: 600_000 }
    );
  }, [resolving, timezoneFallback]);

  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        <span className="capitalize">{dateStr}</span>
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {timeStr}
      </span>
      <span className="hidden sm:flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {location}
        <button
          type="button"
          onClick={requestLocation}
          disabled={resolving}
          aria-label="Usar minha localização"
          title="Usar minha localização"
          className="ml-1 inline-flex items-center justify-center rounded p-0.5 hover:bg-accent disabled:opacity-50"
        >
          <Locate className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}
