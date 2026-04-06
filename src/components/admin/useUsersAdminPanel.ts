'use client';

import { useReducer } from 'react';
import type { Dispatch } from 'react';

import type { Role, UserDTO } from '@/shared/types/domain';
import { roleRequiresAssignedUnit } from './role-unit-utils';

export interface CreateUserForm {
  username: string;
  password: string;
  role: Role;
  hatUnitCode: string | null;
}

const INITIAL_CREATE_FORM: CreateUserForm = {
  username: '',
  password: '',
  role: 'production_manager',
  hatUnitCode: null
};

interface UsersAdminPanelState {
  users: UserDTO[];
  createForm: CreateUserForm;
  passwordInputs: Record<string, string>;
  busyUserId: string | null;
  statusMessage: string | null;
  errorMessage: string | null;
}

type UsersAdminPanelAction =
  | { type: 'set_users'; users: UserDTO[] }
  | { type: 'set_create_form_field'; field: keyof CreateUserForm; value: string | null }
  | { type: 'reset_create_form' }
  | { type: 'set_password_input'; userId: string; value: string }
  | { type: 'set_busy_user_id'; userId: string | null }
  | { type: 'set_status_message'; message: string | null }
  | { type: 'set_error_message'; message: string | null }
  | { type: 'update_user_field'; userId: string; key: keyof UserDTO; value: string | boolean | null };

function reducer(
  state: UsersAdminPanelState,
  action: UsersAdminPanelAction
): UsersAdminPanelState {
  switch (action.type) {
    case 'set_users':
      return {
        ...state,
        users: action.users
      };
    case 'set_create_form_field':
      return {
        ...state,
        createForm: {
          ...state.createForm,
          [action.field]: action.value
        } as CreateUserForm
      };
    case 'reset_create_form':
      return {
        ...state,
        createForm: INITIAL_CREATE_FORM
      };
    case 'set_password_input':
      return {
        ...state,
        passwordInputs: {
          ...state.passwordInputs,
          [action.userId]: action.value
        }
      };
    case 'set_busy_user_id':
      return {
        ...state,
        busyUserId: action.userId
      };
    case 'set_status_message':
      return {
        ...state,
        statusMessage: action.message
      };
    case 'set_error_message':
      return {
        ...state,
        errorMessage: action.message
      };
    case 'update_user_field':
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.userId
            ? ({ ...user, [action.key]: action.value } as UserDTO)
            : user
        )
      };
    default:
      return state;
  }
}

function clearMessages(dispatch: Dispatch<UsersAdminPanelAction>) {
  dispatch({ type: 'set_error_message', message: null });
  dispatch({ type: 'set_status_message', message: null });
}

export function useUsersAdminPanel(initialUsers: UserDTO[]) {
  const [state, dispatch] = useReducer(reducer, {
    users: initialUsers,
    createForm: INITIAL_CREATE_FORM,
    passwordInputs: {},
    busyUserId: null,
    statusMessage: null,
    errorMessage: null
  });

  async function refreshUsers() {
    const response = await fetch('/api/admin/users', { credentials: 'same-origin' });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message ?? 'Kullanıcılar yüklenemedi.');
    }

    dispatch({ type: 'set_users', users: payload.users });
  }

  function setCreateFormField(field: keyof CreateUserForm, value: string | null) {
    dispatch({ type: 'set_create_form_field', field, value });
  }

  function setPasswordInput(userId: string, value: string) {
    dispatch({ type: 'set_password_input', userId, value });
  }

  function updateUserField(userId: string, key: keyof UserDTO, value: string | boolean | null) {
    dispatch({ type: 'update_user_field', userId, key, value });
  }

  async function createUser() {
    clearMessages(dispatch);

    try {
      const createPayload = {
        ...state.createForm,
        hatUnitCode: roleRequiresAssignedUnit(state.createForm.role) ? state.createForm.hatUnitCode : null
      };

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createPayload)
      });

      const payload = await response.json();

      if (!response.ok) {
        dispatch({
          type: 'set_error_message',
          message: payload.error?.message ?? 'Kullanıcı oluşturulamadı.'
        });
        return;
      }

      dispatch({ type: 'reset_create_form' });
      await refreshUsers();
      dispatch({ type: 'set_status_message', message: 'Kullanıcı oluşturuldu.' });
    } catch {
      dispatch({ type: 'set_error_message', message: 'Sunucuya erişilemedi.' });
    }
  }

  async function saveUser(user: UserDTO) {
    dispatch({ type: 'set_busy_user_id', userId: user.id });
    clearMessages(dispatch);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          role: user.role,
          hatUnitCode: roleRequiresAssignedUnit(user.role) ? user.hatUnitCode : null,
          isActive: user.isActive
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        dispatch({
          type: 'set_error_message',
          message: payload.error?.message ?? 'Kullanıcı güncellenemedi.'
        });
        return;
      }

      await refreshUsers();
      dispatch({ type: 'set_status_message', message: 'Kullanıcı güncellendi.' });
    } catch {
      dispatch({ type: 'set_error_message', message: 'Sunucuya erişilemedi.' });
    } finally {
      dispatch({ type: 'set_busy_user_id', userId: null });
    }
  }

  async function resetPassword(userId: string) {
    const nextPassword = state.passwordInputs[userId];

    if (!nextPassword) {
      dispatch({ type: 'set_error_message', message: 'Yeni şifre alanı boş olamaz.' });
      return;
    }

    dispatch({ type: 'set_busy_user_id', userId });
    clearMessages(dispatch);

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: nextPassword })
      });

      const payload = await response.json();

      if (!response.ok) {
        dispatch({
          type: 'set_error_message',
          message: payload.error?.message ?? 'Şifre sıfırlanamadı.'
        });
        return;
      }

      dispatch({ type: 'set_password_input', userId, value: '' });
      dispatch({ type: 'set_status_message', message: 'Kullanıcı şifresi sıfırlandı.' });
    } catch {
      dispatch({ type: 'set_error_message', message: 'Sunucuya erişilemedi.' });
    } finally {
      dispatch({ type: 'set_busy_user_id', userId: null });
    }
  }

  async function deleteUser(userId: string) {
    const approved = window.confirm(
      'Bu kullanıcı kalıcı olarak silinecek. Devam etmek istiyor musunuz?'
    );

    if (!approved) {
      return;
    }

    dispatch({ type: 'set_busy_user_id', userId });
    clearMessages(dispatch);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      const payload = await response.json();

      if (!response.ok) {
        dispatch({
          type: 'set_error_message',
          message: payload.error?.message ?? 'Kullanıcı silinemedi.'
        });
        return;
      }

      await refreshUsers();
      dispatch({
        type: 'set_status_message',
        message: 'Kullanıcı kalıcı olarak silindi.'
      });
    } catch {
      dispatch({ type: 'set_error_message', message: 'Sunucuya erişilemedi.' });
    } finally {
      dispatch({ type: 'set_busy_user_id', userId: null });
    }
  }

  return {
    state,
    setCreateFormField,
    setPasswordInput,
    updateUserField,
    createUser,
    saveUser,
    resetPassword,
    deleteUser
  };
}
