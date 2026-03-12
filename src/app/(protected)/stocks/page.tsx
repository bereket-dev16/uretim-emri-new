import Link from 'next/link';
import { Search, Filter, RotateCcw } from 'lucide-react';

import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { StocksTable } from '@/components/stocks/StocksTable';
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPE_VALUES
} from '@/modules/stocks/constants';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { listStocks } from '@/modules/stocks/service';
import type { Role } from '@/shared/types/domain';
import { requirePageSession } from '@/shared/security/auth-guards';
import { stockListQuerySchema } from '@/shared/validation/stock';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StocksPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'admin', label: 'admin' },
  { value: 'production_manager', label: 'üretim müdürü' },
  { value: 'warehouse_manager', label: 'depo sorumlusu' }
];

function canCreateStock(role: Role): boolean {
  return role === 'admin' || role === 'production_manager' || role === 'warehouse_manager';
}

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const session = await requirePageSession({ permission: PERMISSIONS.STOCKS_VIEW });
  const resolvedSearchParams = (await searchParams) ?? {};

  const rawQuery = {
    query: pickSingleValue(resolvedSearchParams?.query),
    role: pickSingleValue(resolvedSearchParams?.role),
    productType: pickSingleValue(resolvedSearchParams?.productType),
    productCategory: pickSingleValue(resolvedSearchParams?.productCategory),
    stockEntryDate: pickSingleValue(resolvedSearchParams?.stockEntryDate),
    page: pickSingleValue(resolvedSearchParams?.page),
    sort: pickSingleValue(resolvedSearchParams?.sort)
  };

  const parsedResult = stockListQuerySchema.safeParse(rawQuery);
  const parsed = parsedResult.success
    ? parsedResult.data
    : {
      query: undefined,
      role: undefined,
      productType: undefined,
      productCategory: undefined,
      stockEntryDate: undefined,
      page: 1,
      pageSize: 10,
      sort: 'newest' as const
    };

  const canCreate = canCreateStock(session.role);
  const stocks = await listStocks(parsed);

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Stok"
        title="Stok takibi"
        description="Kayıtları arayın, filtreleyin ve gerektiğinde düzenleyin."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/stocks/create">Yeni kayıt</Link>
            </Button>
          ) : null
        }
      />

      <SectionPanel title="Filtreler" description="İhtiyacınız olan kayıtları hızlıca daraltın.">
        <Card className="border-border/0 bg-transparent shadow-none">
          <CardContent className="p-0">
          <form className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtreler
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mt-2">
              <div className="relative col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Arama"
                  name="query"
                  placeholder="İrsaliye, ürün adı veya barkod..."
                  defaultValue={parsed.query ?? ''}
                />
              </div>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Role göre filtre"
                name="role"
                defaultValue={parsed.role ?? ''}
              >
                <option value="">Tüm roller</option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Ürün tipine göre filtre"
                name="productType"
                defaultValue={parsed.productType ?? ''}
              >
                <option value="">Tüm ürün tipleri</option>
                {PRODUCT_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {PRODUCT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Kategoriye göre filtre"
                name="productCategory"
                defaultValue={parsed.productCategory ?? ''}
              >
                <option value="">Tüm kategoriler</option>
                {PRODUCT_CATEGORY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {PRODUCT_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>

              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Stok giriş tarihine göre filtre"
                name="stockEntryDate"
                type="date"
                defaultValue={parsed.stockEntryDate ?? ''}
              />

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Sıralama"
                name="sort"
                defaultValue={parsed.sort}
              >
                <option value="newest">En yeni</option>
                <option value="oldest">En eski</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 justify-end">
              <input type="hidden" name="page" value="1" />
              <Button type="submit" className="w-full sm:w-auto min-w-[120px]">
                Sonuçları Listele
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/stocks" className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Sıfırla
                </Link>
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      </SectionPanel>

      <SectionPanel title="Kayıtlar" description="Liste burada canlı olarak güncellenir.">
        <StocksTable
          items={stocks.items}
          total={stocks.total}
          page={stocks.page}
          pageSize={stocks.pageSize}
          query={parsed.query}
          role={parsed.role}
          productType={parsed.productType}
          productCategory={parsed.productCategory}
          stockEntryDate={parsed.stockEntryDate}
          sort={parsed.sort}
          canManage={canCreate}
        />
      </SectionPanel>
    </div>
  );
}
