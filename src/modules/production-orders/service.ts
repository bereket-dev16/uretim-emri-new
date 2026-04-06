import { randomUUID } from 'node:crypto';

import type { PoolClient, QueryResultRow } from 'pg';

import { getProductionUnitLabel } from '@/modules/production-orders/constants';
import { queryDb, withTransaction } from '@/shared/db/client';
import { AppError } from '@/shared/errors/app-error';
import { deleteStorageObject, downloadStorageObject, uploadStorageObject } from '@/shared/storage/supabase-storage';
import type {
  PaginatedProductionOrdersDTO,
  ProductionOrderAttachmentDTO,
  ProductionOrderDispatchDTO,
  ProductionOrderListItemDTO,
  ProductionOrderStatus,
  ProductionUnit,
  ProductionUnitDTO,
  ProductionUnitGroup,
  Role
} from '@/shared/types/domain';

type DbClient = Pick<PoolClient, 'query'>;

interface ProductionOrderCreateInput {
  orderDate: string;
  orderNo: number;
  customerName: string;
  orderQuantity: number;
  deadlineDate: string;
  finalProductName: string;
  totalPackagingQuantity: number;
  color: string;
  moldText: string;
  hasProspectus: boolean;
  marketScope: 'ihracat' | 'ic_piyasa';
  demandSource: 'numune' | 'musteri_talebi' | 'stok';
  packagingType: 'kapsul' | 'tablet' | 'sivi' | 'sase' | 'softjel';
  noteText: string | null;
  plannedRawUnitCode: ProductionUnit;
  plannedMachineUnitCode: ProductionUnit | null;
}

interface ListProductionOrdersParams {
  scope: 'active' | 'completed' | 'incoming' | 'unit';
  actorRole: Role;
  actorUnitCode: string | null;
  page: number;
  pageSize: number;
}

interface CreateProductionOrderParams {
  input: ProductionOrderCreateInput;
  actorUserId: string;
}

interface DispatchProductionOrderParams {
  id: string;
  unitCode: ProductionUnit;
  actorUserId: string;
}

interface FinishProductionOrderParams {
  id: string;
  actorUserId: string;
}

interface AcceptDispatchParams {
  dispatchId: string;
  actorUserId: string;
  actorRole: Role;
  actorUnitCode: string | null;
}

interface CompleteDispatchParams extends AcceptDispatchParams {
  reportedOutputQuantity: number;
}

interface AttachmentParams {
  orderId: string;
  file: File;
  actorUserId: string;
}

interface ProductionUnitRow extends QueryResultRow {
  code: string;
  name: string;
  unit_group: ProductionUnitGroup;
  is_active: boolean;
}

interface ProductionOrderRow extends QueryResultRow {
  id: string;
  order_date: Date | string;
  order_no: number;
  customer_name: string;
  order_quantity: number;
  deadline_date: Date | string;
  final_product_name: string;
  total_packaging_quantity: number;
  color: string;
  mold_text: string;
  has_prospectus: boolean;
  market_scope: 'ihracat' | 'ic_piyasa';
  demand_source: 'numune' | 'musteri_talebi' | 'stok';
  packaging_type: 'kapsul' | 'tablet' | 'sivi' | 'sase' | 'softjel';
  note_text: string | null;
  planned_raw_unit_code: string;
  planned_machine_unit_code: string | null;
  status: ProductionOrderStatus;
  created_by_username: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProductionOrderDispatchRow extends QueryResultRow {
  id: string;
  production_order_id: string;
  unit_code: string;
  unit_name: string;
  unit_group: ProductionUnitGroup;
  status: 'pending' | 'in_progress' | 'completed';
  dispatched_at: Date | string;
  accepted_at: Date | string | null;
  completed_at: Date | string | null;
  reported_output_quantity: number | null;
}

interface ProductionOrderAttachmentRow extends QueryResultRow {
  id: string;
  production_order_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: Date | string;
  uploaded_by_username: string | null;
  storage_path: string;
}

interface AttachmentDownloadRecord {
  id: string;
  original_filename: string;
  mime_type: string;
  storage_path: string;
}

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const EXTENSION_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function toIsoDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function mapProductionUnit(row: ProductionUnitRow): ProductionUnitDTO {
  return {
    code: row.code,
    name: row.name,
    unitGroup: row.unit_group,
    isActive: row.is_active
  };
}

function mapDispatch(row: ProductionOrderDispatchRow): ProductionOrderDispatchDTO {
  return {
    id: row.id,
    unitCode: row.unit_code,
    unitName: row.unit_name,
    unitGroup: row.unit_group,
    status: row.status,
    dispatchedAt: toIsoDateTime(row.dispatched_at),
    acceptedAt: row.accepted_at ? toIsoDateTime(row.accepted_at) : null,
    completedAt: row.completed_at ? toIsoDateTime(row.completed_at) : null,
    reportedOutputQuantity: row.reported_output_quantity
  };
}

function mapAttachment(row: ProductionOrderAttachmentRow): ProductionOrderAttachmentDTO {
  return {
    id: row.id,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: toIsoDateTime(row.created_at),
    uploadedByUsername: row.uploaded_by_username
  };
}

function mapOrderRow(
  row: ProductionOrderRow,
  attachments: ProductionOrderAttachmentDTO[],
  dispatches: ProductionOrderDispatchDTO[]
): ProductionOrderListItemDTO {
  return {
    id: row.id,
    orderDate: toIsoDate(row.order_date),
    orderNo: Number(row.order_no),
    customerName: row.customer_name,
    orderQuantity: Number(row.order_quantity),
    deadlineDate: toIsoDate(row.deadline_date),
    finalProductName: row.final_product_name,
    totalPackagingQuantity: Number(row.total_packaging_quantity),
    color: row.color,
    moldText: row.mold_text,
    hasProspectus: row.has_prospectus,
    marketScope: row.market_scope,
    demandSource: row.demand_source,
    packagingType: row.packaging_type,
    noteText: row.note_text,
    plannedRawUnitCode: row.planned_raw_unit_code,
    plannedMachineUnitCode: row.planned_machine_unit_code,
    status: row.status,
    createdByUsername: row.created_by_username,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
    attachments,
    dispatches
  };
}

function canViewOrderAttachments(role: Role): boolean {
  return role !== 'machine_operator';
}

function withAttachmentVisibility(
  order: ProductionOrderListItemDTO,
  role: Role
): ProductionOrderListItemDTO {
  if (canViewOrderAttachments(role)) {
    return order;
  }

  return {
    ...order,
    attachments: []
  };
}

async function getUnitWithClient(client: DbClient, unitCode: string): Promise<ProductionUnitRow | null> {
  const result = await client.query<ProductionUnitRow>(
    `
      SELECT code, name, unit_group, is_active
      FROM production_units
      WHERE code = $1
      LIMIT 1
    `,
    [unitCode]
  );

  return result.rows[0] ?? null;
}

async function requireUnitWithGroup(
  client: DbClient,
  unitCode: string,
  expectedGroup: ProductionUnitGroup
): Promise<ProductionUnitRow> {
  const unit = await getUnitWithClient(client, unitCode);

  if (!unit || !unit.is_active) {
    throw new AppError({
      status: 400,
      code: 'UNIT_NOT_FOUND',
      publicMessage: 'Seçilen birim bulunamadı.'
    });
  }

  if (unit.unit_group !== expectedGroup) {
    throw new AppError({
      status: 400,
      code: 'UNIT_GROUP_MISMATCH',
      publicMessage: 'Seçilen birim bu alan için uygun değil.'
    });
  }

  return unit;
}

async function getOrderByIdWithClient(
  client: DbClient,
  orderId: string
): Promise<ProductionOrderListItemDTO | null> {
  const orderResult = await client.query<ProductionOrderRow>(
    `
      SELECT
        o.id,
        o.order_date,
        o.order_no,
        o.customer_name,
        o.order_quantity,
        o.deadline_date,
        o.final_product_name,
        o.total_packaging_quantity,
        o.color,
        o.mold_text,
        o.has_prospectus,
        o.market_scope,
        o.demand_source,
        o.packaging_type,
        o.note_text,
        o.planned_raw_unit_code,
        o.planned_machine_unit_code,
        o.status,
        creator.username AS created_by_username,
        o.created_at,
        o.updated_at
      FROM production_orders o
      JOIN users creator ON creator.id = o.created_by
      WHERE o.id = $1::uuid
      LIMIT 1
    `,
    [orderId]
  );

  const orderRow = orderResult.rows[0];

  if (!orderRow) {
    return null;
  }

  const dispatchResult = await client.query<ProductionOrderDispatchRow>(
    `
      SELECT
        d.id,
        d.production_order_id,
        d.unit_code,
        pu.name AS unit_name,
        d.unit_group,
        d.status,
        d.dispatched_at,
        d.accepted_at,
        d.completed_at,
        d.reported_output_quantity
      FROM production_order_dispatches d
      JOIN production_units pu ON pu.code = d.unit_code
      WHERE d.production_order_id = $1::uuid
      ORDER BY d.dispatched_at ASC, d.created_at ASC
    `,
    [orderId]
  );

  const attachmentResult = await client.query<ProductionOrderAttachmentRow>(
    `
      SELECT
        a.id,
        a.production_order_id,
        a.original_filename,
        a.mime_type,
        a.size_bytes,
        a.created_at,
        uploader.username AS uploaded_by_username,
        a.storage_path
      FROM production_order_attachments a
      LEFT JOIN users uploader ON uploader.id = a.uploaded_by
      WHERE a.production_order_id = $1::uuid
      ORDER BY a.created_at ASC
    `,
    [orderId]
  );

  return mapOrderRow(
    orderRow,
    attachmentResult.rows.map(mapAttachment),
    dispatchResult.rows.map(mapDispatch)
  );
}

function buildScopeFilter(params: {
  scope: ListProductionOrdersParams['scope'];
  actorUnitCode: string | null;
  offset?: number;
}): { whereSql: string; values: unknown[] } {
  const values: unknown[] = [];

  switch (params.scope) {
    case 'active':
      return {
        whereSql: `WHERE o.status = 'active'`,
        values
      };
    case 'completed':
      return {
        whereSql: `WHERE o.status = 'completed'`,
        values
      };
    case 'incoming':
      if (!params.actorUnitCode) {
        return { whereSql: `WHERE 1 = 0`, values };
      }
      values.push(params.actorUnitCode);
      return {
        whereSql: `
          WHERE o.status = 'active'
            AND EXISTS (
              SELECT 1
              FROM production_order_dispatches d
              WHERE d.production_order_id = o.id
                AND d.unit_code = $1
                AND d.status = 'pending'
            )
        `,
        values
      };
    case 'unit':
      if (!params.actorUnitCode) {
        return { whereSql: `WHERE 1 = 0`, values };
      }
      values.push(params.actorUnitCode);
      return {
        whereSql: `
          WHERE o.status = 'active'
            AND EXISTS (
              SELECT 1
              FROM production_order_dispatches d
              WHERE d.production_order_id = o.id
                AND d.unit_code = $1
                AND d.status = 'in_progress'
            )
        `,
        values
      };
    default:
      return { whereSql: '', values };
  }
}

function normalizeFilename(filename: string): string {
  return filename
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function resolveAttachmentMimeType(file: File): string | null {
  if (file.type && ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const extension = file.name.split('.').pop()?.trim().toLowerCase();

  if (!extension) {
    return null;
  }

  return EXTENSION_MIME_TYPES[extension] ?? null;
}

function getOpenDispatches(
  order: ProductionOrderListItemDTO,
  unitGroup?: ProductionUnitGroup
): ProductionOrderDispatchDTO[] {
  return order.dispatches.filter(
    (dispatch) =>
      (!unitGroup || dispatch.unitGroup === unitGroup) &&
      (dispatch.status === 'pending' || dispatch.status === 'in_progress')
  );
}

async function ensureActiveOrder(client: DbClient, orderId: string): Promise<ProductionOrderListItemDTO> {
  const order = await getOrderByIdWithClient(client, orderId);

  if (!order) {
    throw new AppError({
      status: 404,
      code: 'ORDER_NOT_FOUND',
      publicMessage: 'Üretim emri bulunamadı.'
    });
  }

  if (order.status !== 'active') {
    throw new AppError({
      status: 409,
      code: 'ORDER_ALREADY_COMPLETED',
      publicMessage: 'Bu üretim emri tamamlanmış durumda.'
    });
  }

  return order;
}

export async function listProductionUnits(params?: {
  unitGroup?: ProductionUnitGroup;
  activeOnly?: boolean;
}): Promise<ProductionUnitDTO[]> {
  const whereParts: string[] = [];
  const values: unknown[] = [];

  if (params?.unitGroup) {
    values.push(params.unitGroup);
    whereParts.push(`unit_group = $${values.length}`);
  }

  if (params?.activeOnly ?? true) {
    whereParts.push(`is_active = TRUE`);
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const result = await queryDb<ProductionUnitRow>(
    `
      SELECT code, name, unit_group, is_active
      FROM production_units
      ${whereSql}
      ORDER BY unit_group ASC, name ASC
    `,
    values
  );

  return result.rows.map(mapProductionUnit);
}

export async function listProductionOrders(
  params: ListProductionOrdersParams
): Promise<PaginatedProductionOrdersDTO> {
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, Math.min(50, params.pageSize));
  const offset = (page - 1) * pageSize;

  const { whereSql, values } = buildScopeFilter({
    scope: params.scope,
    actorUnitCode: params.actorUnitCode
  });

  const countResult = await queryDb<{ total: number }>(
    `
      SELECT COUNT(*)::int AS total
      FROM production_orders o
      ${whereSql}
    `,
    values
  );

  const orderValues = [...values, pageSize, offset];
  const ordersResult = await queryDb<ProductionOrderRow>(
    `
      SELECT
        o.id,
        o.order_date,
        o.order_no,
        o.customer_name,
        o.order_quantity,
        o.deadline_date,
        o.final_product_name,
        o.total_packaging_quantity,
        o.color,
        o.mold_text,
        o.has_prospectus,
        o.market_scope,
        o.demand_source,
        o.packaging_type,
        o.note_text,
        o.planned_raw_unit_code,
        o.planned_machine_unit_code,
        o.status,
        creator.username AS created_by_username,
        o.created_at,
        o.updated_at
      FROM production_orders o
      JOIN users creator ON creator.id = o.created_by
      ${whereSql}
      ORDER BY
        CASE WHEN o.status = 'active' THEN o.deadline_date END ASC NULLS LAST,
        o.updated_at DESC,
        o.created_at DESC
      LIMIT $${orderValues.length - 1}
      OFFSET $${orderValues.length}
    `,
    orderValues
  );

  if (ordersResult.rows.length === 0) {
    return {
      items: [],
      total: countResult.rows[0]?.total ?? 0,
      page,
      pageSize
    };
  }

  const orderIds = ordersResult.rows.map((row) => row.id);

  const dispatchResult = await queryDb<ProductionOrderDispatchRow>(
    `
      SELECT
        d.id,
        d.production_order_id,
        d.unit_code,
        pu.name AS unit_name,
        d.unit_group,
        d.status,
        d.dispatched_at,
        d.accepted_at,
        d.completed_at,
        d.reported_output_quantity
      FROM production_order_dispatches d
      JOIN production_units pu ON pu.code = d.unit_code
      WHERE d.production_order_id = ANY($1::uuid[])
      ORDER BY d.dispatched_at ASC, d.created_at ASC
    `,
    [orderIds]
  );

  const attachmentResult = canViewOrderAttachments(params.actorRole)
    ? await queryDb<ProductionOrderAttachmentRow>(
        `
          SELECT
            a.id,
            a.production_order_id,
            a.original_filename,
            a.mime_type,
            a.size_bytes,
            a.created_at,
            uploader.username AS uploaded_by_username,
            a.storage_path
          FROM production_order_attachments a
          LEFT JOIN users uploader ON uploader.id = a.uploaded_by
          WHERE a.production_order_id = ANY($1::uuid[])
          ORDER BY a.created_at ASC
        `,
        [orderIds]
      )
    : { rows: [] };

  const dispatchMap = new Map<string, ProductionOrderDispatchDTO[]>();
  const attachmentMap = new Map<string, ProductionOrderAttachmentDTO[]>();

  for (const row of dispatchResult.rows) {
    const list = dispatchMap.get(row.production_order_id) ?? [];
    list.push(mapDispatch(row));
    dispatchMap.set(row.production_order_id, list);
  }

  for (const row of attachmentResult.rows) {
    const list = attachmentMap.get(row.production_order_id) ?? [];
    list.push(mapAttachment(row));
    attachmentMap.set(row.production_order_id, list);
  }

  return {
    items: ordersResult.rows.map((row) =>
      withAttachmentVisibility(
        mapOrderRow(row, attachmentMap.get(row.id) ?? [], dispatchMap.get(row.id) ?? []),
        params.actorRole
      )
    ),
    total: countResult.rows[0]?.total ?? 0,
    page,
    pageSize
  };
}

export async function getProductionOrderById(orderId: string): Promise<ProductionOrderListItemDTO> {
  const dbClient = {
    query: ((text: string, values?: unknown[]) => queryDb(text, values)) as DbClient['query']
  };
  const order = await getOrderByIdWithClient(
    dbClient,
    orderId
  );

  if (!order) {
    throw new AppError({
      status: 404,
      code: 'ORDER_NOT_FOUND',
      publicMessage: 'Üretim emri bulunamadı.'
    });
  }

  return order;
}

export async function createProductionOrder(
  params: CreateProductionOrderParams
): Promise<ProductionOrderListItemDTO> {
  return withTransaction(async (client) => {
    await requireUnitWithGroup(client, params.input.plannedRawUnitCode, 'HAMMADDE');
    if (params.input.plannedMachineUnitCode) {
      await requireUnitWithGroup(client, params.input.plannedMachineUnitCode, 'MAKINE');
    }

    const createdResult = await client.query<{ id: string }>(
      `
        INSERT INTO production_orders (
          order_date,
          order_no,
          customer_name,
          order_quantity,
          deadline_date,
          final_product_name,
          total_packaging_quantity,
          color,
          mold_text,
          has_prospectus,
          market_scope,
          demand_source,
          packaging_type,
          note_text,
          planned_raw_unit_code,
          planned_machine_unit_code,
          status,
          created_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, 'active', $17
        )
        RETURNING id
      `,
      [
        params.input.orderDate,
        params.input.orderNo,
        params.input.customerName,
        params.input.orderQuantity,
        params.input.deadlineDate,
        params.input.finalProductName,
        params.input.totalPackagingQuantity,
        params.input.color,
        params.input.moldText,
        params.input.hasProspectus,
        params.input.marketScope,
        params.input.demandSource,
        params.input.packagingType,
        params.input.noteText,
        params.input.plannedRawUnitCode,
        params.input.plannedMachineUnitCode,
        params.actorUserId
      ]
    );

    const orderId = createdResult.rows[0]?.id;

    if (!orderId) {
      throw new AppError({
        status: 500,
        code: 'ORDER_CREATE_FAILED',
        publicMessage: 'Üretim emri oluşturulamadı.'
      });
    }

    await client.query(
      `
        INSERT INTO production_order_dispatches (
          production_order_id,
          unit_code,
          status,
          dispatched_by
        )
        VALUES ($1::uuid, $2, 'pending', $3::uuid)
      `,
      [orderId, params.input.plannedRawUnitCode, params.actorUserId]
    );

    if (params.input.plannedMachineUnitCode) {
      await client.query(
        `
          INSERT INTO production_order_dispatches (
            production_order_id,
            unit_code,
            status,
            dispatched_by
          )
          VALUES ($1::uuid, $2, 'pending', $3::uuid)
        `,
        [orderId, params.input.plannedMachineUnitCode, params.actorUserId]
      );
    }

    const createdOrder = await getOrderByIdWithClient(client, orderId);

    if (!createdOrder) {
      throw new AppError({
        status: 500,
        code: 'ORDER_CREATE_FAILED',
        publicMessage: 'Üretim emri oluşturuldu ancak okunamadı.'
      });
    }

    return createdOrder;
  }).catch((error) => {
    const pgError = error as { code?: string };

    if (pgError.code === '23505') {
      throw new AppError({
        status: 409,
        code: 'ORDER_NO_EXISTS',
        publicMessage: 'Bu iş emri numarası zaten kullanılıyor.'
      });
    }

    throw error;
  });
}

export async function dispatchProductionOrder(
  params: DispatchProductionOrderParams
): Promise<ProductionOrderListItemDTO> {
  return withTransaction(async (client) => {
    const order = await ensureActiveOrder(client, params.id);
    const unit = await getUnitWithClient(client, params.unitCode);

    if (!unit || !unit.is_active) {
      throw new AppError({
        status: 400,
        code: 'UNIT_NOT_FOUND',
        publicMessage: 'Sevk edilecek birim bulunamadı.'
      });
    }

    if (order.dispatches.some((dispatch) => dispatch.unitCode === params.unitCode)) {
      throw new AppError({
        status: 409,
        code: 'DISPATCH_ALREADY_EXISTS',
        publicMessage: 'Bu üretim emri aynı birime tekrar gönderilemez.'
      });
    }

    if (getOpenDispatches(order, unit.unit_group).length > 0) {
      throw new AppError({
        status: 409,
        code: 'DISPATCH_GROUP_BUSY',
        publicMessage: 'Aynı grupta açık bir görev varken yeni sevk açılamaz.'
      });
    }

    await client.query(
      `
        INSERT INTO production_order_dispatches (
          production_order_id,
          unit_code,
          status,
          dispatched_by
        )
        VALUES ($1::uuid, $2, 'pending', $3::uuid)
      `,
      [params.id, params.unitCode, params.actorUserId]
    );

    const updatedOrder = await getOrderByIdWithClient(client, params.id);

    if (!updatedOrder) {
      throw new AppError({
        status: 404,
        code: 'ORDER_NOT_FOUND',
        publicMessage: 'Üretim emri bulunamadı.'
      });
    }

    return updatedOrder;
  }).catch((error) => {
    const pgError = error as { code?: string; constraint?: string };

    if (
      pgError.code === '23505' &&
      pgError.constraint === 'idx_production_order_dispatches_open_group_unique'
    ) {
      throw new AppError({
        status: 409,
        code: 'DISPATCH_GROUP_BUSY',
        publicMessage: 'Aynı grupta açık bir görev varken yeni sevk açılamaz.'
      });
    }

    throw error;
  });
}

export async function finishProductionOrder(
  params: FinishProductionOrderParams
): Promise<ProductionOrderListItemDTO> {
  return withTransaction(async (client) => {
    const order = await ensureActiveOrder(client, params.id);

    if (getOpenDispatches(order).length > 0) {
      throw new AppError({
        status: 409,
        code: 'ORDER_HAS_OPEN_DISPATCH',
        publicMessage: 'Hammadde veya makine tarafında açık görev varken emir bitirilemez.'
      });
    }

    await client.query(
      `
        UPDATE production_orders
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [order.id]
    );

    const updatedOrder = await getOrderByIdWithClient(client, params.id);

    if (!updatedOrder) {
      throw new AppError({
        status: 404,
        code: 'ORDER_NOT_FOUND',
        publicMessage: 'Üretim emri bulunamadı.'
      });
    }

    return updatedOrder;
  });
}

export async function acceptProductionOrderDispatch(
  params: AcceptDispatchParams
): Promise<ProductionOrderListItemDTO> {
  return withTransaction(async (client) => {
    const dispatchResult = await client.query<{
      id: string;
      production_order_id: string;
      unit_code: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>(
      `
        SELECT id, production_order_id, unit_code, status
        FROM production_order_dispatches
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [params.dispatchId]
    );

    const dispatch = dispatchResult.rows[0];

    if (!dispatch) {
      throw new AppError({
        status: 404,
        code: 'DISPATCH_NOT_FOUND',
        publicMessage: 'Sevk kaydı bulunamadı.'
      });
    }

    if (!params.actorUnitCode || params.actorUnitCode !== dispatch.unit_code) {
      throw new AppError({
        status: 403,
        code: 'DISPATCH_UNIT_MISMATCH',
        publicMessage: 'Bu sevk kaydını yalnız ilgili birim kabul edebilir.'
      });
    }

    if (dispatch.status !== 'pending') {
      throw new AppError({
        status: 409,
        code: 'DISPATCH_NOT_PENDING',
        publicMessage: 'Bu görev bekleyen durumda değil.'
      });
    }

    await client.query(
      `
        UPDATE production_order_dispatches
        SET status = 'in_progress',
            accepted_by = $2::uuid,
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [dispatch.id, params.actorUserId]
    );

    const updatedOrder = await getOrderByIdWithClient(client, dispatch.production_order_id);

    if (!updatedOrder) {
      throw new AppError({
        status: 404,
        code: 'ORDER_NOT_FOUND',
        publicMessage: 'Üretim emri bulunamadı.'
      });
    }

    return withAttachmentVisibility(updatedOrder, params.actorRole);
  });
}

export async function completeProductionOrderDispatch(
  params: CompleteDispatchParams
): Promise<ProductionOrderListItemDTO> {
  return withTransaction(async (client) => {
    const dispatchResult = await client.query<{
      id: string;
      production_order_id: string;
      unit_code: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>(
      `
        SELECT id, production_order_id, unit_code, status
        FROM production_order_dispatches
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [params.dispatchId]
    );

    const dispatch = dispatchResult.rows[0];

    if (!dispatch) {
      throw new AppError({
        status: 404,
        code: 'DISPATCH_NOT_FOUND',
        publicMessage: 'Sevk kaydı bulunamadı.'
      });
    }

    if (!params.actorUnitCode || params.actorUnitCode !== dispatch.unit_code) {
      throw new AppError({
        status: 403,
        code: 'DISPATCH_UNIT_MISMATCH',
        publicMessage: 'Bu sevk kaydını yalnız ilgili birim tamamlayabilir.'
      });
    }

    if (dispatch.status !== 'in_progress') {
      throw new AppError({
        status: 409,
        code: 'DISPATCH_NOT_IN_PROGRESS',
        publicMessage: 'Bu görev çalışıyor durumda değil.'
      });
    }

    await client.query(
      `
        UPDATE production_order_dispatches
        SET status = 'completed',
            completed_by = $2::uuid,
            completed_at = NOW(),
            reported_output_quantity = $3,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [dispatch.id, params.actorUserId, params.reportedOutputQuantity]
    );

    const updatedOrder = await getOrderByIdWithClient(client, dispatch.production_order_id);

    if (!updatedOrder) {
      throw new AppError({
        status: 404,
        code: 'ORDER_NOT_FOUND',
        publicMessage: 'Üretim emri bulunamadı.'
      });
    }

    return withAttachmentVisibility(updatedOrder, params.actorRole);
  });
}

export async function addProductionOrderAttachment(
  params: AttachmentParams
): Promise<ProductionOrderAttachmentDTO> {
  if (params.file.size <= 0) {
    throw new AppError({
      status: 400,
      code: 'EMPTY_ATTACHMENT',
      publicMessage: 'Boş dosya yüklenemez.'
    });
  }

  const mimeType = resolveAttachmentMimeType(params.file);

  if (!mimeType) {
    throw new AppError({
      status: 400,
      code: 'ATTACHMENT_TYPE_NOT_ALLOWED',
      publicMessage: 'Yalnız PDF, görsel, Word ve Excel dosyaları yüklenebilir.'
    });
  }

  const extensionSafeName = normalizeFilename(params.file.name || 'ek-dosya');
  const storagePath = `${params.orderId}/${randomUUID()}-${extensionSafeName || 'dosya'}`;

  await uploadStorageObject({
    path: storagePath,
    file: params.file
  });

  try {
    const result = await queryDb<ProductionOrderAttachmentRow>(
      `
        INSERT INTO production_order_attachments (
          production_order_id,
          storage_path,
          original_filename,
          mime_type,
          size_bytes,
          uploaded_by
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid)
        RETURNING
          id,
          production_order_id,
          original_filename,
          mime_type,
          size_bytes,
          created_at,
          NULL::text AS uploaded_by_username,
          storage_path
      `,
      [
        params.orderId,
        storagePath,
        params.file.name || 'ek-dosya',
        mimeType,
        params.file.size,
        params.actorUserId
      ]
    );

    return mapAttachment(result.rows[0]);
  } catch (error) {
    await deleteStorageObject(storagePath).catch(() => undefined);
    throw error;
  }
}

export async function getProductionOrderAttachmentDownload(params: {
  orderId: string;
  attachmentId: string;
}): Promise<{
  filename: string;
  mimeType: string;
  response: Response;
}> {
  const result = await queryDb<AttachmentDownloadRecord>(
    `
      SELECT id, original_filename, mime_type, storage_path
      FROM production_order_attachments
      WHERE id = $1::uuid
        AND production_order_id = $2::uuid
      LIMIT 1
    `,
    [params.attachmentId, params.orderId]
  );

  const attachment = result.rows[0];

  if (!attachment) {
    throw new AppError({
      status: 404,
      code: 'ATTACHMENT_NOT_FOUND',
      publicMessage: 'Ek dosya bulunamadı.'
    });
  }

  return {
    filename: attachment.original_filename,
    mimeType: attachment.mime_type,
    response: await downloadStorageObject(attachment.storage_path)
  };
}

export function getSuggestedNextMachineUnit(
  order: ProductionOrderListItemDTO
): ProductionUnit | null {
  const alreadyUsedUnits = new Set(order.dispatches.map((dispatch) => dispatch.unitCode));

  if (!order.plannedMachineUnitCode) {
    return null;
  }

  if (!alreadyUsedUnits.has(order.plannedMachineUnitCode)) {
    return order.plannedMachineUnitCode;
  }

  return null;
}

export function getCurrentDispatch(
  order: ProductionOrderListItemDTO
): ProductionOrderDispatchDTO | null {
  const openDispatch =
    order.dispatches.find((dispatch) => dispatch.status === 'in_progress') ??
    order.dispatches.find((dispatch) => dispatch.status === 'pending');

  if (openDispatch) {
    return openDispatch;
  }

  return order.dispatches[order.dispatches.length - 1] ?? null;
}

export function getDispatchStatusLabel(status: ProductionOrderDispatchDTO['status']): string {
  switch (status) {
    case 'pending':
      return 'Bekliyor';
    case 'in_progress':
      return 'Çalışıyor';
    case 'completed':
      return 'Tamamlandı';
    default:
      return status;
  }
}

export function getOrderStateLabel(order: ProductionOrderListItemDTO): string {
  if (order.status === 'completed') {
    return 'Bitti';
  }

  const currentDispatch = getCurrentDispatch(order);

  if (!currentDispatch) {
    return 'Hazır';
  }

  return `${getProductionUnitLabel(currentDispatch.unitCode, currentDispatch.unitName)} / ${getDispatchStatusLabel(currentDispatch.status)}`;
}
