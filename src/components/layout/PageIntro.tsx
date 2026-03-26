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
    <section className={cn('page-card px-5 py-5 sm:px-6 sm:py-6', className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {badge ? <span className="page-kicker">{badge}</span> : null}
          <div className="space-y-2">
            <h1 className="text-[2rem] font-semibold text-slate-950 sm:text-[2.4rem]">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
