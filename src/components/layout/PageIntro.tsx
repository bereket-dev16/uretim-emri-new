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
    <section className={cn('ops-panel rounded-[30px] px-6 py-7 sm:px-8 sm:py-8', className)}>
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          {badge ? <span className="ops-kicker">{badge}</span> : null}
          <div className="space-y-3">
            <h1 className="max-w-4xl text-[2.45rem] leading-[0.92] text-foreground sm:text-[3.1rem]">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm font-medium leading-7 text-muted-foreground sm:text-base">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}
