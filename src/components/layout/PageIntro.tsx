import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageIntroProps {
  badge?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageIntro({ badge, title, description, actions, className }: PageIntroProps) {
  return (
    <section className={cn('page-card px-4 py-3', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {badge ? <span className="page-kicker">{badge}</span> : null}
          <div className="space-y-1">
            <h1 className="text-[1.5rem] font-semibold text-slate-950 sm:text-[1.75rem]">{title}</h1>
            {description ? (
              <p className="max-w-4xl text-sm leading-5 text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 lg:pl-4">{actions}</div> : null}
      </div>
    </section>
  );
}
