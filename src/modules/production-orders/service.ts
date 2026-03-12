import type { PoolClient } from 'pg';

import { AppError } from '@/shared/errors/app-error';
import { queryDb, withTransaction } from '@/shared/db/client';
import type {
  ProductionDispatchStatus,
  ProductionOrderListItemDTO,
  ProductionOrderMaterialDTO,
  ProductionUnitDTO,
  ProductionUnit,
  Role
} from '@/shared/types/domain';

interface ProductionOrderCreateInput {
  orderDate: string;
  orderNo: string;
  customerName: string;
  marketScope: 'ihracat' | 'ic_piyasa';
  demandSource: 'numune' | 'musteri_talebi' | 'stok';
  orderQuantity: string;
  deadlineDate: string;
  finalProductName: string;
  packagingType: 'kapsul' | 'tablet' | 'sivi' | 'sase' | 'softjel';
  totalAmountText: string;
  dispatchUnits: ProductionUnit[];
  materials: Array<{
    materialProductType: string;
    materialName: string;
    materialQuantityText: string;
  }>;
}

interface CreateProductionOrderParams {
  input: ProductionOrderCreateInput;
  actorUserId: string;
  actorRole: Role;
  requestId: string;
}

interface DeleteProductionOrderParams {
  id: string;
  actorUserId: string;
  requestId: string;
}

interface ListProductionOrdersParams {
  scope: 'all' | 'warehouse' | 'monitor' | 'unit';
  actorRole: Role;
  actorUnitCode: ProductionUnit | null;
  limit?: number;
}

interface ProductionOrderRow {
  id: string;
  order_date: Date | string;
  order_no: string;
  customer_name: string;
  market_scope: 'ihracat' | 'ic_piyasa';
  demand_source: 'numune' | 'musteri_talebi' | 'stok';
  order_quantity: string;
  deadline_date: Date | string;
  final_product_name: string;
  packaging_type: 'kapsul' | 'tablet' | 'sivi' | 'sase' | 'softjel';
  total_amount_text: string;
  dispatch_unit_code: ProductionUnit;
  created_by_role: Role;
  created_at: Date | string;
  materials_json: unknown;
  dispatches_json: unknown;
}

interface ProductionUnitRow {
  code: string;
  name: string;
  is_active: boolean;
}

const BASE_SELECT = `
  SELECT
    o.id,
    o.order_date,
    o.order_no,
    o.customer_name,
    o.market_scope,
    o.demand_source,
    o.order_quantity,
    o.deadline_date,
    o.final_product_name,
    o.packaging_type,
    o.total_amount_text,
    o.dispatch_unit_code,
    o.created_by_role,
    o.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'materialProductType', m.material_product_type,
            'materialName', m.material_name,
            'materialQuantityText', m.material_quantity_text,
            'isAvailable', m.is_available,
            'checkedAt', m.checked_at,
            'checkedByUsername', checked_user.username
          )
          ORDER BY m.created_at ASC
        )
        FROM production_order_materials m
        LEFT JOIN users checked_user ON checked_user.id = m.checked_by
        WHERE m.production_order_id = o.id
      ),
      '[]'::jsonb
    ) AS materials_json,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'unitCode', d.unit_code,
            'unitName', COALESCE(pu.name, d.unit_code),
            'status', d.status,
            'dispatchedAt', d.dispatched_at,
            'acceptedAt', d.accepted_at,
            'completedAt', d.completed_at
          )
          ORDER BY d.created_at ASC
        )
        FROM production_order_dispatches d
        LEFT JOIN production_units pu ON pu.code = d.unit_code
        WHERE d.production_order_id = o.id
      ),
      '[]'::jsonb
    ) AS dispatches_json
  FROM production_orders o
`;

function toIsoDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function mapOrderRow(row: ProductionOrderRow): ProductionOrderListItemDTO {
  const materialsRaw = parseJsonArray<{
    id: string;
    materialProductType: ProductionOrderMaterialDTO['materialProductType'];
    materialName: string;
    materialQuantityText: string;
    isAvailable: boolean;
    checkedAt: string | null;
    checkedByUsername: string | null;
  }>(row.materials_json);

  const dispatchesRaw = parseJsonArray<{
    id: string;
    unitCode: ProductionUnit;
    unitName: string;
    status: ProductionDispatchStatus;
    dispatchedAt: string;
    acceptedAt: string | null;
    completedAt: string | null;
  }>(row.dispatches_json);

  return {
    id: row.id,
    orderDate: toIsoDate(row.order_date),
    orderNo: row.order_no,
    customerName: row.customer_name,
    marketScope: row.market_scope,
    demandSource: row.demand_source,
    orderQuantity: row.order_quantity,
    deadlineDate: toIsoDate(row.deadline_date),
    finalProductName: row.final_product_name,
    packagingType: row.packaging_type,
    totalAmountText: row.total_amount_text,
    dispatchUnitCode: row.dispatch_unit_code,
    createdByRole: row.created_by_role,
    createdAt: toIsoDateTime(row.created_at),
    materials: materialsRaw.map((item) => ({
      id: item.id,
      materialProductType: item.materialProductType,
      materialName: item.materialName,
      materialQuantityText: item.materialQuantityText,
      isAvailable: Boolean(item.isAvailable),
      checkedAt: item.checkedAt ? new Date(item.checkedAt).toISOString() : null,
      checkedByUsername: item.checkedByUsername
    })),
    dispatches: dispatchesRaw.map((item) => ({
      id: item.id,
      unitCode: item.unitCode,
      unitName: item.unitName,
      status: item.status,
      dispatchedAt: new Date(item.dispatchedAt).toISOString(),
      acceptedAt: item.acceptedAt ? new Date(item.acceptedAt).toISOString() : null,
      completedAt: item.completedAt ? new Date(item.completedAt).toISOString() : null
    }))
  };
}

function normalizeCreateInput(input: ProductionOrderCreateInput): ProductionOrderCreateInput {
  const normalizedDispatchUnits = Array.from(
    new Set(input.dispatchUnits.map((unit) => unit.trim()).filter(Boolean))
  );

  return {
    ...input,
    orderNo: input.orderNo.trim(),
    customerName: input.customerName.trim(),
    orderQuantity: input.orderQuantity.trim(),
    finalProductName: input.finalProductName.trim(),
    totalAmountText: input.totalAmountText.trim(),
    dispatchUnits: normalizedDispatchUnits,
    materials: input.materials.map((item) => ({
      materialProductType: item.materialProductType,
      materialName: item.materialName.trim(),
      materialQuantityText: item.materialQuantityText.trim()
    }))
  };
}

async function getOrderByIdWithClient(
  client: Pick<PoolClient, 'query'>,
  id: string
): Promise<ProductionOrderListItemDTO | null> {
  const result = await client.query<ProductionOrderRow>(
    `
      ${BASE_SELECT}
      WHERE o.id = $1::uuid
      LIMIT 1
    `,
    [id]
  );

  const row = result.rows[0];
  return row ? mapOrderRow(row) : null;
}

export async function listActiveProductionUnits(): Promise<ProductionUnitDTO[]> {
  const result = await queryDb<ProductionUnitRow>(
    `
      SELECT code, name, is_active
      FROM production_units
      WHERE is_active = TRUE
      ORDER BY name ASC
    `
  );

  return result.rows.map((row) => ({
    code: row.code,
    name: row.name,
    isActive: row.is_active
  }));
}

export function getUnitCodeByRole(role: Role): ProductionUnit | null {
  if (role === 'tablet1') {
    return 'TABLET1';
  }

  return null;
}

export async function createProductionOrder(
  params: CreateProductionOrderParams
): Promise<ProductionOrderListItemDTO> {
  const input = normalizeCreateInput(params.input);

  if (input.dispatchUnits.length === 0) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      publicMessage: 'En az bir sevk birimi seçilmelidir.'
    });
  }

  return withTransaction(async (client) => {
    let orderId: string | null = null;

    try {
      const insertOrderResult = await client.query<{ id: string }>(
        `
          INSERT INTO production_orders (
            order_date,
            order_no,
            customer_name,
            market_scope,
            demand_source,
            order_quantity,
            deadline_date,
            final_product_name,
            packaging_type,
            total_amount_text,
            dispatch_unit_code,
            created_by,
            created_by_role
          )
          VALUES (
            $1::date,
            $2::varchar(64),
            $3::varchar(120),
            $4::varchar(16),
            $5::varchar(32),
            $6::varchar(64),
            $7::date,
            $8::varchar(120),
            $9::varchar(16),
            $10::varchar(120),
            $11::varchar(16),
            $12::uuid,
            $13::role_type
          )
          RETURNING id
        `,
        [
          input.orderDate,
          input.orderNo,
          input.customerName,
          input.marketScope,
          input.demandSource,
          input.orderQuantity,
          input.deadlineDate,
          input.finalProductName,
          input.packagingType,
          input.totalAmountText,
          input.dispatchUnits[0],
          params.actorUserId,
          params.actorRole
        ]
      );

      orderId = insertOrderResult.rows[0]?.id ?? null;
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        throw new AppError({
          status: 409,
          code: 'PRODUCTION_ORDER_NO_EXISTS',
          publicMessage: 'Bu iş emri numarası zaten kayıtlı.'
        });
      }

      throw error;
    }

    if (!orderId) {
      throw new AppError({
        status: 500,
        code: 'PRODUCTION_ORDER_CREATE_FAILED',
        publicMessage: 'Üretim emri oluşturulamadı.'
      });
    }

    for (const material of input.materials) {
      await client.query(
        `
          INSERT INTO production_order_materials (
            production_order_id,
            material_product_type,
            material_name,
            material_quantity_text
          )
          VALUES (
            $1::uuid,
            $2::varchar(32),
            $3::varchar(120),
            $4::varchar(120)
          )
        `,
        [
          orderId,
          material.materialProductType,
          material.materialName,
          material.materialQuantityText
        ]
      );
    }

    for (const unitCode of input.dispatchUnits) {
      await client.query(
        `
          INSERT INTO production_order_dispatches (
            production_order_id,
            unit_code,
            status,
            dispatched_by,
            dispatched_at
          )
          VALUES ($1::uuid, $2::varchar(16), 'pending', $3::uuid, NOW())
          ON CONFLICT (production_order_id, unit_code)
          DO UPDATE
            SET status = 'pending',
                dispatched_by = EXCLUDED.dispatched_by,
                dispatched_at = NOW(),
                accepted_by = NULL,
                accepted_at = NULL,
                completed_by = NULL,
                completed_at = NULL,
                updated_at = NOW()
        `,
        [orderId, unitCode, params.actorUserId]
      );
    }

    await client.query(
      `
        INSERT INTO audit_logs (
          actor_user_id,
          action_type,
          entity_type,
          entity_id,
          payload_json,
          request_id
        )
        VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::uuid)
      `,
      [
        params.actorUserId,
        'PRODUCTION_ORDER_CREATED',
        'production_order',
        orderId,
        JSON.stringify({
          orderNo: input.orderNo,
          dispatchUnits: input.dispatchUnits,
          materialCount: input.materials.length
        }),
        params.requestId
      ]
    );

    const created = await getOrderByIdWithClient(client, orderId);
    if (!created) {
      throw new AppError({
        status: 500,
        code: 'PRODUCTION_ORDER_CREATE_FAILED',
        publicMessage: 'Üretim emri oluşturulamadı.'
      });
    }

    return created;
  });
}

export async function deleteProductionOrder(params: DeleteProductionOrderParams): Promise<void> {
  await withTransaction(async (client) => {
    const existingResult = await client.query<{
      id: string;
      order_no: string;
      material_count: number;
      dispatch_count: number;
    }>(
      `
        SELECT
          o.id,
          o.order_no,
          (
            SELECT COUNT(*)::int
            FROM production_order_materials m
            WHERE m.production_order_id = o.id
          ) AS material_count,
          (
            SELECT COUNT(*)::int
            FROM production_order_dispatches d
            WHERE d.production_order_id = o.id
          ) AS dispatch_count
        FROM production_orders o
        WHERE o.id = $1::uuid
        LIMIT 1
      `,
      [params.id]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      throw new AppError({
        status: 404,
        code: 'PRODUCTION_ORDER_NOT_FOUND',
        publicMessage: 'Üretim emri bulunamadı.'
      });
    }

    await client.query(
      `
        DELETE FROM production_orders
        WHERE id = $1::uuid
      `,
      [params.id]
    );

    await client.query(
      `
        INSERT INTO audit_logs (
          actor_user_id,
          action_type,
          entity_type,
          entity_id,
          payload_json,
          request_id
        )
        VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::uuid)
      `,
      [
        params.actorUserId,
        'PRODUCTION_ORDER_DELETED',
        'production_order',
        params.id,
        JSON.stringify({
          orderNo: existing.order_no,
          materialCount: existing.material_count,
          dispatchCount: existing.dispatch_count
        }),
        params.requestId
      ]
    );
  });
}

export async function listProductionOrders(
  params: ListProductionOrdersParams
): Promise<ProductionOrderListItemDTO[]> {
  const whereClauses: string[] = ['1 = 1'];
  const values: unknown[] = [];

  if (params.scope === 'warehouse') {
    whereClauses.push(
      `EXISTS (
        SELECT 1
        FROM production_order_dispatches d
        WHERE d.production_order_id = o.id
          AND d.unit_code = 'DEPO'
          AND d.status <> 'completed'
      )`
    );
  }

  if (params.scope === 'unit') {
    if (!params.actorUnitCode) {
      return [];
    }

    values.push(params.actorUnitCode);
    whereClauses.push(
      `EXISTS (
        SELECT 1
        FROM production_order_dispatches d
        WHERE d.production_order_id = o.id
          AND d.unit_code = $${values.length}::varchar(16)
      )`
    );
  }

  const safeLimit = Math.min(Math.max(params.limit ?? 120, 1), 300);
  values.push(safeLimit);

  const result = await queryDb<ProductionOrderRow>(
    `
      ${BASE_SELECT}
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY o.created_at DESC
      LIMIT $${values.length}::int
    `,
    values
  );

  return result.rows.map(mapOrderRow);
}

interface UpdateMaterialAvailabilityParams {
  orderId: string;
  materialId: string;
  isAvailable: boolean;
  actorUserId: string;
  requestId: string;
}

export async function updateProductionOrderMaterialAvailability(
  params: UpdateMaterialAvailabilityParams
): Promise<void> {
  const result = await queryDb<{ id: string }>(
    `
      UPDATE production_order_materials
      SET
        is_available = $3::boolean,
        checked_by = CASE WHEN $3::boolean THEN $4::uuid ELSE NULL END,
        checked_at = CASE WHEN $3::boolean THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1::uuid
        AND production_order_id = $2::uuid
      RETURNING id
    `,
    [params.materialId, params.orderId, params.isAvailable, params.actorUserId]
  );

  if (!result.rows[0]) {
    throw new AppError({
      status: 404,
      code: 'PRODUCTION_ORDER_MATERIAL_NOT_FOUND',
      publicMessage: 'Malzeme satırı bulunamadı.'
    });
  }

  await queryDb(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        entity_type,
        entity_id,
        payload_json,
        request_id
      )
      VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::uuid)
    `,
    [
      params.actorUserId,
      'PRODUCTION_ORDER_MATERIAL_CHECKED',
      'production_order',
      params.orderId,
      JSON.stringify({
        materialId: params.materialId,
        isAvailable: params.isAvailable
      }),
      params.requestId
    ]
  );
}

interface DispatchProductionOrderParams {
  orderId: string;
  unitCodes: ProductionUnit[];
  actorUserId: string;
  requestId: string;
}

export async function dispatchProductionOrder(
  params: DispatchProductionOrderParams
): Promise<void> {
  if (params.unitCodes.includes('DEPO')) {
    throw new AppError({
      status: 400,
      code: 'INVALID_DISPATCH_UNIT',
      publicMessage: 'DEPO birimi hedef sevk birimi olamaz.'
    });
  }

  await withTransaction(async (client) => {
    const orderResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM production_orders
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [params.orderId]
    );

    if (!orderResult.rows[0]) {
      throw new AppError({
        status: 404,
        code: 'PRODUCTION_ORDER_NOT_FOUND',
        publicMessage: 'Üretim emri bulunamadı.'
      });
    }

    const materialSummary = await client.query<{
      total_count: number;
      available_count: number;
    }>(
      `
        SELECT
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE is_available = TRUE)::int AS available_count
        FROM production_order_materials
        WHERE production_order_id = $1::uuid
      `,
      [params.orderId]
    );

    const totalCount = materialSummary.rows[0]?.total_count ?? 0;
    const availableCount = materialSummary.rows[0]?.available_count ?? 0;

    if (totalCount === 0 || availableCount !== totalCount) {
      throw new AppError({
        status: 400,
        code: 'MATERIALS_NOT_READY',
        publicMessage:
          'Sevk için tüm malzemeler depo tarafından uygun olarak işaretlenmelidir.'
      });
    }

    for (const unitCode of params.unitCodes) {
      await client.query(
        `
          INSERT INTO production_order_dispatches (
            production_order_id,
            unit_code,
            status,
            dispatched_by,
            dispatched_at
          )
          VALUES ($1::uuid, $2::varchar(16), 'pending', $3::uuid, NOW())
          ON CONFLICT (production_order_id, unit_code)
          DO UPDATE
            SET status = 'pending',
                dispatched_by = EXCLUDED.dispatched_by,
                dispatched_at = NOW(),
                accepted_by = NULL,
                accepted_at = NULL,
                completed_by = NULL,
                completed_at = NULL,
                updated_at = NOW()
        `,
        [params.orderId, unitCode, params.actorUserId]
      );
    }

    await client.query(
      `
        INSERT INTO audit_logs (
          actor_user_id,
          action_type,
          entity_type,
          entity_id,
          payload_json,
          request_id
        )
        VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::uuid)
      `,
      [
        params.actorUserId,
        'PRODUCTION_ORDER_DISPATCHED',
        'production_order',
        params.orderId,
        JSON.stringify({
          unitCodes: params.unitCodes
        }),
        params.requestId
      ]
    );
  });
}

interface UpdateDispatchStatusParams {
  dispatchId: string;
  actorUserId: string;
  actorRole: Role;
  actorUnitCode: ProductionUnit | null;
  requestId: string;
}

async function ensureDispatchPermission(
  dispatchId: string,
  actorRole: Role,
  actorUnitCode: ProductionUnit | null
): Promise<{ unitCode: ProductionUnit; productionOrderId: string; status: ProductionDispatchStatus }> {
  const dispatchResult = await queryDb<{
    id: string;
    production_order_id: string;
    unit_code: ProductionUnit;
    status: ProductionDispatchStatus;
  }>(
    `
      SELECT id, production_order_id, unit_code, status
      FROM production_order_dispatches
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [dispatchId]
  );

  const dispatch = dispatchResult.rows[0];
  if (!dispatch) {
    throw new AppError({
      status: 404,
      code: 'PRODUCTION_ORDER_DISPATCH_NOT_FOUND',
      publicMessage: 'Üretim görevi bulunamadı.'
    });
  }

  if (actorRole !== 'admin') {
    const allowedUnitCode =
      actorRole === 'tablet1' ? getUnitCodeByRole(actorRole) : actorUnitCode;

    if (!allowedUnitCode || allowedUnitCode !== dispatch.unit_code) {
      throw new AppError({
        status: 403,
        code: 'FORBIDDEN',
        publicMessage: 'Bu görevi güncelleme yetkiniz bulunmuyor.'
      });
    }
  }

  return {
    unitCode: dispatch.unit_code,
    productionOrderId: dispatch.production_order_id,
    status: dispatch.status
  };
}

export async function acceptProductionOrderDispatch(
  params: UpdateDispatchStatusParams
): Promise<void> {
  const dispatch = await ensureDispatchPermission(
    params.dispatchId,
    params.actorRole,
    params.actorUnitCode
  );

  if (dispatch.status === 'completed') {
    throw new AppError({
      status: 409,
      code: 'DISPATCH_ALREADY_COMPLETED',
      publicMessage: 'Görev zaten tamamlandı.'
    });
  }

  if (dispatch.status === 'in_progress') {
    return;
  }

  await queryDb(
    `
      UPDATE production_order_dispatches
      SET
        status = 'in_progress',
        accepted_by = $2::uuid,
        accepted_at = COALESCE(accepted_at, NOW()),
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [params.dispatchId, params.actorUserId]
  );

  await queryDb(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        entity_type,
        entity_id,
        payload_json,
        request_id
      )
      VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::uuid)
    `,
    [
      params.actorUserId,
      'PRODUCTION_ORDER_TASK_ACCEPTED',
      'production_order',
      dispatch.productionOrderId,
      JSON.stringify({
        dispatchId: params.dispatchId,
        unitCode: dispatch.unitCode
      }),
      params.requestId
    ]
  );
}

export async function completeProductionOrderDispatch(
  params: UpdateDispatchStatusParams
): Promise<void> {
  const dispatch = await ensureDispatchPermission(
    params.dispatchId,
    params.actorRole,
    params.actorUnitCode
  );

  if (dispatch.status === 'completed') {
    return;
  }

  await queryDb(
    `
      UPDATE production_order_dispatches
      SET
        status = 'completed',
        accepted_by = COALESCE(accepted_by, $2::uuid),
        accepted_at = COALESCE(accepted_at, NOW()),
        completed_by = $2::uuid,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [params.dispatchId, params.actorUserId]
  );

  await queryDb(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        entity_type,
        entity_id,
        payload_json,
        request_id
      )
      VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::uuid)
    `,
    [
      params.actorUserId,
      'PRODUCTION_ORDER_TASK_COMPLETED',
      'production_order',
      dispatch.productionOrderId,
      JSON.stringify({
        dispatchId: params.dispatchId,
        unitCode: dispatch.unitCode
      }),
      params.requestId
    ]
  );
}
