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
    <section className={cn('page-card px-5 py-5 sm:px-6 sm:py-6', className)}>
      {(title || description || action) && (
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            {title ? <h2 className="text-xl font-semibold text-slate-950">{title}</h2> : null}
            {description ? <p className="text-sm leading-7 text-slate-600">{description}</p> : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </header>
      )}
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </section>
  );
}
