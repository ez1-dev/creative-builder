interface Props {
  code?: string | number | null;
  desc?: string | null;
  mono?: boolean;
}

export function CodeWithDesc({ code, desc, mono = true }: Props) {
  const c = code == null ? '' : String(code);
  const d = desc == null ? '' : String(desc).trim();
  if (!c && !d) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="text-xs">
      <span className={mono ? 'font-mono' : ''}>{c || '—'}</span>
      {d && c !== d && <span className="text-muted-foreground"> — {d}</span>}
    </span>
  );
}
