'use client';

import type { Role, ProductionUnitDTO, UserDTO } from '@/shared/types/domain';
import { UsersMobileCard } from './UsersMobileCard';
import { useUsersAdminPanel } from './useUsersAdminPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UsersAdminPanelProps {
  initialUsers: UserDTO[];
  productionUnits: ProductionUnitDTO[];
}

interface CreateUserCardProps {
  username: string;
  password: string;
  role: Role;
  hatUnitCode: string | null;
  productionUnits: ProductionUnitDTO[];
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: Role) => void;
  onHatUnitChange: (value: string | null) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function RoleOptions() {
  return (
    <>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="production_manager">Üretim Müdürü</SelectItem>
      <SelectItem value="hat">Hat Operatörü</SelectItem>
    </>
  );
}

function CreateUserCard({
  username,
  password,
  role,
  hatUnitCode,
  productionUnits,
  onUsernameChange,
  onPasswordChange,
  onRoleChange,
  onHatUnitChange,
  onSubmit
}: CreateUserCardProps) {
  const isHatRole = role === 'hat';

  return (
    <section className="rounded-[18px] border border-border/70 bg-white p-5 sm:p-6">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Yeni kullanıcı</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Kullanıcı bilgilerini girin ve rolünü seçin.
        </p>
      </div>

      <form className="grid grid-cols-1 items-end gap-4 xl:grid-cols-5" onSubmit={onSubmit}>
          <div className="space-y-2 md:col-span-1">
            <span className="text-sm font-medium">Kullanıcı Adı</span>
            <Input
              aria-label="Yeni kullanıcı adı"
              placeholder="Orn: ahmet.yilmaz"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <span className="text-sm font-medium">Şifre</span>
            <Input
              aria-label="Yeni kullanıcı şifresi"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <span className="text-sm font-medium">Rol</span>
            <Select
              value={role}
              onValueChange={(value) => {
                const nextRole = value as Role;
                onRoleChange(nextRole);

                if (nextRole !== 'hat') {
                  onHatUnitChange(null);
                }
              }}
            >
              <SelectTrigger className="bg-slate-50">
                <SelectValue placeholder="Rol seçin" />
              </SelectTrigger>
              <SelectContent>
                <RoleOptions />
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <span className="text-sm font-medium">Hat Birimi</span>
            <Select
              value={hatUnitCode ?? '__none__'}
              onValueChange={(value) => onHatUnitChange(value === '__none__' ? null : value)}
              disabled={!isHatRole}
            >
              <SelectTrigger className="bg-slate-50">
                <SelectValue placeholder="Hat birimi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Seçilmedi</SelectItem>
                {productionUnits.map((unit) => (
                  <SelectItem key={unit.code} value={unit.code}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full xl:col-span-1 xl:w-auto">
            Kullanıcı Oluştur
          </Button>
        </form>

        {isHatRole ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-muted-foreground">
            Hat operatörü seçildiğinde kullanıcı yalnız atanmış hattın görev ekranını görür.
          </div>
        ) : null}
    </section>
  );
}

interface UserRowProps {
  user: UserDTO;
  productionUnits: ProductionUnitDTO[];
  busyUserId: string | null;
  passwordValue: string;
  onUsernameChange: (userId: string, value: string) => void;
  onRoleChange: (userId: string, value: Role) => void;
  onHatUnitChange: (userId: string, value: string | null) => void;
  onActiveChange: (userId: string, value: boolean) => void;
  onPasswordChange: (userId: string, value: string) => void;
  onSave: (user: UserDTO) => void;
  onResetPassword: (userId: string) => void;
  onDelete: (userId: string) => void;
}

function UserRow({
  user,
  productionUnits,
  busyUserId,
  passwordValue,
  onUsernameChange,
  onRoleChange,
  onHatUnitChange,
  onActiveChange,
  onPasswordChange,
  onSave,
  onResetPassword,
  onDelete
}: UserRowProps) {
  const isHatRole = user.role === 'hat';

  return (
    <TableRow>
      <TableCell>
        <Input
          aria-label={`${user.username} kullanıcı adı`}
          value={user.username}
          onChange={(event) => onUsernameChange(user.id, event.target.value)}
          className="h-8 max-w-[150px]"
        />
      </TableCell>
      <TableCell>
        <Select
          value={user.role}
          onValueChange={(value) => {
            const nextRole = value as Role;
            onRoleChange(user.id, nextRole);

            if (nextRole !== 'hat') {
              onHatUnitChange(user.id, null);
            }
          }}
        >
          <SelectTrigger className="h-8 w-[190px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <RoleOptions />
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={user.hatUnitCode ?? '__none__'}
          onValueChange={(value) => onHatUnitChange(user.id, value === '__none__' ? null : value)}
          disabled={!isHatRole}
        >
          <SelectTrigger className="h-8 w-[170px]">
            <SelectValue placeholder="Hat birimi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seçilmedi</SelectItem>
            {productionUnits.map((unit) => (
              <SelectItem key={unit.code} value={unit.code}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <input
          aria-label={`${user.username} aktif durumu`}
          type="checkbox"
          checked={user.isActive}
          onChange={(event) => onActiveChange(user.id, event.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer accent-primary"
        />
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('tr-TR') : '-'}
      </TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={() => onSave(user)} disabled={busyUserId === user.id}>
          Kaydet
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            aria-label={`${user.username} yeni şifre`}
            type="password"
            placeholder="Yeni şifre"
            value={passwordValue}
            onChange={(event) => onPasswordChange(user.id, event.target.value)}
            className="h-8 w-[120px]"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onResetPassword(user.id)}
            disabled={busyUserId === user.id}
          >
            Reset
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(user.id)}
          disabled={busyUserId === user.id}
        >
          Sil
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface UsersTableCardProps {
  users: UserDTO[];
  productionUnits: ProductionUnitDTO[];
  busyUserId: string | null;
  passwordInputs: Record<string, string>;
  onUsernameChange: (userId: string, value: string) => void;
  onRoleChange: (userId: string, value: Role) => void;
  onHatUnitChange: (userId: string, value: string | null) => void;
  onActiveChange: (userId: string, value: boolean) => void;
  onPasswordChange: (userId: string, value: string) => void;
  onSave: (user: UserDTO) => void;
  onResetPassword: (userId: string) => void;
  onDelete: (userId: string) => void;
}

function UsersTableCard({
  users,
  productionUnits,
  busyUserId,
  passwordInputs,
  onUsernameChange,
  onRoleChange,
  onHatUnitChange,
  onActiveChange,
  onPasswordChange,
  onSave,
  onResetPassword,
  onDelete
}: UsersTableCardProps) {
  return (
    <section className="rounded-[18px] border border-border/70 bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Kullanıcı listesi</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Hesapları düzenleyin, şifre yenileyin ve aktif durumlarını yönetin.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-border/70 bg-slate-50 px-3 py-1 text-sm text-muted-foreground">
          Toplam {users.length} kullanıcı
        </div>
      </div>

      <div className="space-y-4">
          <div className="space-y-3 lg:hidden">
            {users.map((user) => (
              <UsersMobileCard
                key={user.id}
                user={user}
                productionUnits={productionUnits}
                busyUserId={busyUserId}
                passwordValue={passwordInputs[user.id] ?? ''}
                onUsernameChange={onUsernameChange}
                onRoleChange={onRoleChange}
                onHatUnitChange={onHatUnitChange}
                onActiveChange={onActiveChange}
                onPasswordChange={onPasswordChange}
                onSave={onSave}
                onResetPassword={onResetPassword}
                onDelete={onDelete}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-slate-50 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı adı</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Hat Birimi</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead>Son Giriş</TableHead>
                  <TableHead>Güncelle</TableHead>
                  <TableHead>Şifre Sıfırla</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    productionUnits={productionUnits}
                    busyUserId={busyUserId}
                    passwordValue={passwordInputs[user.id] ?? ''}
                    onUsernameChange={onUsernameChange}
                    onRoleChange={onRoleChange}
                    onHatUnitChange={onHatUnitChange}
                    onActiveChange={onActiveChange}
                    onPasswordChange={onPasswordChange}
                    onSave={onSave}
                    onResetPassword={onResetPassword}
                    onDelete={onDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
      </div>
    </section>
  );
}

export function UsersAdminPanel({ initialUsers, productionUnits }: UsersAdminPanelProps) {
  const {
    state,
    setCreateFormField,
    setPasswordInput,
    updateUserField,
    createUser,
    saveUser,
    resetPassword,
    deleteUser
  } = useUsersAdminPanel(initialUsers);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createUser();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <CreateUserCard
        username={state.createForm.username}
        password={state.createForm.password}
        role={state.createForm.role}
        hatUnitCode={state.createForm.hatUnitCode}
        productionUnits={productionUnits}
        onUsernameChange={(value) => setCreateFormField('username', value)}
        onPasswordChange={(value) => setCreateFormField('password', value)}
        onRoleChange={(value) => setCreateFormField('role', value)}
        onHatUnitChange={(value) => setCreateFormField('hatUnitCode', value)}
        onSubmit={handleCreateUser}
      />

      {state.statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {state.statusMessage}
        </div>
      )}
      {state.errorMessage && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {state.errorMessage}
        </div>
      )}

      <UsersTableCard
        users={state.users}
        productionUnits={productionUnits}
        busyUserId={state.busyUserId}
        passwordInputs={state.passwordInputs}
        onUsernameChange={(userId, value) => updateUserField(userId, 'username', value)}
        onRoleChange={(userId, value) => updateUserField(userId, 'role', value)}
        onHatUnitChange={(userId, value) => updateUserField(userId, 'hatUnitCode', value)}
        onActiveChange={(userId, value) => updateUserField(userId, 'isActive', value)}
        onPasswordChange={setPasswordInput}
        onSave={saveUser}
        onResetPassword={resetPassword}
        onDelete={deleteUser}
      />
    </div>
  );
}
