import { TvModeButton } from '@/components/TvModeButton';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Esconde o botão "Modo TV" do header. Default: false (mostra). */
  hideTvButton?: boolean;
}

export function PageHeader({ title, description, actions, hideTvButton }: PageHeaderProps) {
  return (
    <div data-ai-avoid="page-header" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg 3xl:text-2xl 4xl:text-3xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-xs 3xl:text-sm 4xl:text-base text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {!hideTvButton && <TvModeButton />}
      </div>
    </div>
  );
}
