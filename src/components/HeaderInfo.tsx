import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

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

function getLocationLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezoneMap[tz]) return timezoneMap[tz];
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

export function HeaderInfo() {
  const [now, setNow] = useState(() => new Date());
  const location = useMemo(getLocationLabel, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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
      </span>
    </div>
  );
}
