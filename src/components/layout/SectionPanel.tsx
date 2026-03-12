import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionPanelProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName
}: SectionPanelProps) {
  return (
    <section className={cn('ops-panel rounded-[18px] px-5 py-5 sm:px-6 sm:py-6', className)}>
      <div className="relative z-10">
        {title || description || action ? (
          <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
              {description ? <p className="text-sm leading-7 text-muted-foreground">{description}</p> : null}
            </div>
            {action ? <div className="flex items-center gap-2">{action}</div> : null}
          </header>
        ) : null}
        <div className={cn('min-w-0', contentClassName)}>{children}</div>
      </div>
    </section>
  );
}
