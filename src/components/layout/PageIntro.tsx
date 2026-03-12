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
    <section className={cn('ops-panel rounded-[20px] px-6 py-6 sm:px-8 sm:py-7', className)}>
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {badge ? <span className="ops-kicker">{badge}</span> : null}
          <div className="space-y-2">
            <h1 className="text-3xl leading-tight text-foreground sm:text-[2rem]">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
