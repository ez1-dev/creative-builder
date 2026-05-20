import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const Monaco = lazy(() => import('@monaco-editor/react').then((m) => ({ default: m.default })));

interface Props {
  value: string;
  onChange: (v: string) => void;
  height?: number | string;
  readOnly?: boolean;
}

export function SqlEditor({ value, onChange, height = 360, readOnly }: Props) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      <Suspense fallback={<Skeleton className="w-full" style={{ height }} />}>
        <Monaco
          height={height}
          defaultLanguage="sql"
          language="sql"
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v ?? '')}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </Suspense>
    </div>
  );
}
