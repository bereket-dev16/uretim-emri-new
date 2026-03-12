'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';

import type { StockListItem } from '@/shared/types/domain';

import type { EditableRow } from './types';

interface StocksTableState {
  rows: StockListItem[];
  totalCount: number;
  editingId: string | null;
  draft: EditableRow | null;
  busyId: string | null;
  deleteCandidateId: string | null;
  errorMessage: string | null;
  statusMessage: string | null;
}

type StocksTableAction =
  | { type: 'sync_from_server'; items: StockListItem[]; total: number }
  | { type: 'start_editing'; id: string; draft: EditableRow }
  | { type: 'cancel_editing' }
  | { type: 'patch_draft'; patch: Partial<EditableRow> }
  | { type: 'set_busy'; id: string | null }
  | { type: 'set_delete_candidate'; id: string | null }
  | { type: 'set_error'; message: string | null }
  | { type: 'set_status'; message: string | null }
  | { type: 'replace_row'; item: StockListItem }
  | { type: 'remove_row'; id: string };

function toEditableRow(item: StockListItem): EditableRow {
  return {
    irsaliyeNo: item.irsaliyeNo,
    productName: item.productName,
    quantityNumeric: String(item.quantityNumeric),
    quantityUnit: item.quantityUnit,
    productType: item.productType,
    productCategory: item.productCategory,
    stockEntryDate: item.stockEntryDate
  };
}

function reducer(state: StocksTableState, action: StocksTableAction): StocksTableState {
  switch (action.type) {
    case 'sync_from_server':
      return {
        ...state,
        rows: action.items,
        totalCount: action.total,
        editingId: null,
        draft: null,
        deleteCandidateId: null
      };
    case 'start_editing':
      return {
        ...state,
        editingId: action.id,
        draft: action.draft
      };
    case 'cancel_editing':
      return {
        ...state,
        editingId: null,
        draft: null
      };
    case 'patch_draft':
      return state.draft
        ? {
            ...state,
            draft: {
              ...state.draft,
              ...action.patch
            }
          }
        : state;
    case 'set_busy':
      return {
        ...state,
        busyId: action.id
      };
    case 'set_delete_candidate':
      return {
        ...state,
        deleteCandidateId: action.id
      };
    case 'set_error':
      return {
        ...state,
        errorMessage: action.message
      };
    case 'set_status':
      return {
        ...state,
        statusMessage: action.message
      };
    case 'replace_row':
      return {
        ...state,
        rows: state.rows.map((row) => (row.id === action.item.id ? action.item : row))
      };
    case 'remove_row':
      return {
        ...state,
        rows: state.rows.filter((row) => row.id !== action.id),
        totalCount: Math.max(0, state.totalCount - 1),
        deleteCandidateId: null,
        editingId: state.editingId === action.id ? null : state.editingId,
        draft: state.editingId === action.id ? null : state.draft
      };
    default:
      return state;
  }
}

interface UseStocksTableStateParams {
  items: StockListItem[];
  total: number;
  pageSize: number;
}

export function useStocksTableState({
  items,
  total,
  pageSize
}: UseStocksTableStateParams) {
  const [state, dispatch] = useReducer(reducer, {
    rows: items,
    totalCount: total,
    editingId: null,
    draft: null,
    busyId: null,
    deleteCandidateId: null,
    errorMessage: null,
    statusMessage: null
  });

  useEffect(() => {
    dispatch({ type: 'sync_from_server', items, total });
  }, [items, total]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(state.totalCount / pageSize)),
    [pageSize, state.totalCount]
  );

  function startEditing(item: StockListItem) {
    dispatch({ type: 'set_error', message: null });
    dispatch({ type: 'set_status', message: null });
    dispatch({ type: 'start_editing', id: item.id, draft: toEditableRow(item) });
  }

  function cancelEditing() {
    dispatch({ type: 'cancel_editing' });
  }

  function patchDraft(patch: Partial<EditableRow>) {
    dispatch({ type: 'patch_draft', patch });
  }

  function openDeleteModal(id: string) {
    dispatch({ type: 'set_error', message: null });
    dispatch({ type: 'set_status', message: null });
    dispatch({ type: 'set_delete_candidate', id });
  }

  function closeDeleteModal() {
    dispatch({ type: 'set_delete_candidate', id: null });
  }

  function setBusyId(id: string | null) {
    dispatch({ type: 'set_busy', id });
  }

  function setErrorMessage(message: string | null) {
    dispatch({ type: 'set_error', message });
  }

  function setStatusMessage(message: string | null) {
    dispatch({ type: 'set_status', message });
  }

  function replaceRow(item: StockListItem) {
    dispatch({ type: 'replace_row', item });
  }

  function removeRow(id: string) {
    dispatch({ type: 'remove_row', id });
  }

  const syncFromServer = useCallback((items: StockListItem[], total: number) => {
    dispatch({ type: 'sync_from_server', items, total });
  }, []);

  return {
    state,
    totalPages,
    syncFromServer,
    startEditing,
    cancelEditing,
    patchDraft,
    openDeleteModal,
    closeDeleteModal,
    setBusyId,
    setErrorMessage,
    setStatusMessage,
    replaceRow,
    removeRow
  };
}
