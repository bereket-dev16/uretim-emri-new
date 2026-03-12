import { UsersAdminPanel } from '@/components/admin/UsersAdminPanel';
import { PageIntro } from '@/components/layout/PageIntro';
import { listActiveProductionUnits } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { listUsers } from '@/modules/users/service';
import { requirePageSession } from '@/shared/security/auth-guards';

export default async function AdminUsersPage() {
  await requirePageSession({
    permission: PERMISSIONS.ADMIN_USERS_VIEW,
    fallbackPath: '/dashboard'
  });

  const users = await listUsers();
  const productionUnits = await listActiveProductionUnits();

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Yönetim"
        title="Kullanıcı yönetimi"
        description="Kullanıcıları ekleyin, rollerini güncelleyin ve hesap durumlarını yönetin."
      />
      <UsersAdminPanel initialUsers={users} productionUnits={productionUnits} />
    </div>
  );
}
