'use client';

import type { ProductionUnitDTO, Role, UserDTO } from '@/shared/types/domain';
import { ROLE_LABELS } from '@/shared/constants/role-labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UsersMobileCardProps {
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

function RoleOptions() {
  return (
    <>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="production_manager">Üretim Müdürü</SelectItem>
      <SelectItem value="warehouse_manager">Depo Sorumlusu</SelectItem>
      <SelectItem value="hat">Hat Operatörü</SelectItem>
      <SelectItem value="tablet1">tablet1 (legacy)</SelectItem>
    </>
  );
}

export function UsersMobileCard({
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
}: UsersMobileCardProps) {
  const isHatRole = user.role === 'hat';

  return (
    <article className="rounded-[18px] border border-border/70 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{user.username}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            aria-label={`${user.username} aktif durumu`}
            type="checkbox"
            checked={user.isActive}
            onChange={(event) => onActiveChange(user.id, event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-primary"
          />
          Aktif
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        <Input
          aria-label={`${user.username} kullanıcı adı`}
          value={user.username}
          onChange={(event) => onUsernameChange(user.id, event.target.value)}
        />
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
          <SelectTrigger className="bg-slate-50">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <RoleOptions />
          </SelectContent>
        </Select>
        <Select
          value={user.hatUnitCode ?? '__none__'}
          onValueChange={(value) => onHatUnitChange(user.id, value === '__none__' ? null : value)}
          disabled={!isHatRole}
        >
          <SelectTrigger className="bg-slate-50">
            <SelectValue placeholder="Hat birimi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seçilmedi</SelectItem>
            {productionUnits
              .filter((unit) => unit.code !== 'DEPO')
              .map((unit) => (
                <SelectItem key={unit.code} value={unit.code}>
                  {unit.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="rounded-xl border border-border/70 bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
          Son giriş: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('tr-TR') : '-'}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            aria-label={`${user.username} yeni şifre`}
            type="password"
            placeholder="Yeni şifre"
            value={passwordValue}
            onChange={(event) => onPasswordChange(user.id, event.target.value)}
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
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onSave(user)} disabled={busyUserId === user.id}>
          Kaydet
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(user.id)}
          disabled={busyUserId === user.id}
        >
          Sil
        </Button>
      </div>
    </article>
  );
}
