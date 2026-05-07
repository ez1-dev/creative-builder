import { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export interface DashboardTab { value: string; label: string; content: ReactNode }

export function DashboardTabs({
  tabs, value, onValueChange, defaultValue,
}: { tabs: DashboardTab[]; value?: string; onValueChange?: (v: string) => void; defaultValue?: string }) {
  return (
    <Tabs value={value} onValueChange={onValueChange} defaultValue={defaultValue ?? tabs[0]?.value}>
      <TabsList>
        {tabs.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
      </TabsList>
      {tabs.map((t) => <TabsContent key={t.value} value={t.value} className="mt-3">{t.content}</TabsContent>)}
    </Tabs>
  );
}
