import { AppError } from '@/shared/errors/app-error';
import { queryDb, withTransaction } from '@/shared/db/client';
import type {
  ProductCategory,
  ProductType,
  Role,
  StockCreateInput,
  StockListItem
} from '@/shared/types/domain';

interface ListStocksParams {
  query?: string;
  role?: Role;
  productType?: ProductType;
  productCategory?: ProductCategory;
  stockEntryDate?: string;
  page: number;
  pageSize: number;
  sort: 'newest' | 'oldest';
}

interface StockRow {
  id: string;
  irsaliye_no: string;
  product_name: string;
  quantity_numeric: string;
  quantity_unit: 'gr' | 'adet';
  product_type: ProductType;
  product_category: ProductCategory;
  stock_entry_date: string | Date;
  barcode_no: string;
  created_by_role: Role;
  created_at: Date | string;
}

function toIsoDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

function mapStockRow(row: StockRow): StockListItem {
  return {
    id: row.id,
    irsaliyeNo: row.irsaliye_no,
    productName: row.product_name,
    quantityNumeric: Number(row.quantity_numeric),
    quantityUnit: row.quantity_unit,
    productType: row.product_type,
    stockEntryDate: toIsoDate(row.stock_entry_date),
    productCategory: row.product_category,
    barcodeNo: row.barcode_no,
    createdByRole: row.created_by_role,
    createdAt: new Date(row.created_at).toISOString()
  };
}

export async function listStocks(params: ListStocksParams): Promise<{
  items: StockListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const whereClauses: string[] = ['1 = 1'];
  const values: unknown[] = [];

  if (params.query) {
    values.push(`%${params.query}%`);
    whereClauses.push(
      `(irsaliye_no ILIKE $${values.length} OR product_name ILIKE $${values.length} OR barcode_no ILIKE $${values.length})`
    );
  }

  if (params.role) {
    values.push(params.role);
    whereClauses.push(`created_by_role = $${values.length}::role_type`);
  }

  if (params.productType) {
    values.push(params.productType);
    whereClauses.push(`product_type = $${values.length}::varchar(32)`);
  }

  if (params.productCategory) {
    values.push(params.productCategory);
    whereClauses.push(`product_category = $${values.length}::varchar(16)`);
  }

  if (params.stockEntryDate) {
    values.push(params.stockEntryDate);
    whereClauses.push(`stock_entry_date = $${values.length}::date`);
  }

  const whereSql = whereClauses.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;
  const sortSql = params.sort === 'oldest' ? 'created_at ASC' : 'created_at DESC';

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM stocks
    WHERE ${whereSql}
  `;

  const dataValues = [...values, params.pageSize, offset];

  const dataQuery = `
    SELECT
      id,
      irsaliye_no,
      product_name,
      quantity_numeric,
      quantity_unit,
      product_type,
      product_category,
      stock_entry_date,
      barcode_no,
      created_by_role,
      created_at
    FROM stocks
    WHERE ${whereSql}
    ORDER BY ${sortSql}
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const [countResult, dataResult] = await Promise.all([
    queryDb<{ total: number }>(countQuery, values),
    queryDb<StockRow>(dataQuery, dataValues)
  ]);

  return {
    items: dataResult.rows.map(mapStockRow),
    total: Number(countResult.rows[0]?.total ?? 0),
    page: params.page,
    pageSize: params.pageSize
  };
}

interface CreateStockResult {
  item: StockListItem;
  warning: string | null;
}

interface CreateStockParams {
  input: StockCreateInput;
  actorUserId: string;
  actorRole: Role;
  requestId: string;
}

export async function createStock(params: CreateStockParams): Promise<CreateStockResult> {
  const normalizedInput: StockCreateInput = {
    irsaliyeNo: params.input.irsaliyeNo.trim(),
    productName: params.input.productName.trim(),
    quantityNumeric: params.input.quantityNumeric,
    quantityUnit: params.input.quantityUnit,
    productType: params.input.productType,
    stockEntryDate: params.input.stockEntryDate,
    productCategory: params.input.productCategory
  };

  return withTransaction(async (client) => {
    const duplicateResult = await client.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM stocks
        WHERE irsaliye_no = $1::varchar(64)
          AND product_name = $2::varchar(120)
          AND quantity_numeric = $3::numeric
          AND quantity_unit = $4::varchar(16)
          AND product_type = $5::varchar(32)
          AND product_category = $6::varchar(16)
          AND stock_entry_date = $7::date
      `,
      [
        normalizedInput.irsaliyeNo,
        normalizedInput.productName,
        normalizedInput.quantityNumeric,
        normalizedInput.quantityUnit,
        normalizedInput.productType,
        normalizedInput.productCategory,
        normalizedInput.stockEntryDate
      ]
    );

    const duplicateCount = duplicateResult.rows[0]?.count ?? 0;

    const insertResult = await client.query<StockRow>(
      `
        WITH next_serial AS (
          SELECT nextval('barcode_serial_seq') AS serial
        )
        INSERT INTO stocks (
          irsaliye_no,
          product_name,
          quantity_numeric,
          quantity_unit,
          product_type,
          product_category,
          stock_entry_date,
          pvc_unlimited,
          barcode_serial,
          barcode_no,
          combined_code,
          created_by,
          created_by_role
        )
        SELECT
          $1::varchar(64),
          $2::varchar(120),
          $3::numeric,
          $4::varchar(16),
          $5::varchar(32),
          $6::varchar(16),
          $7::date,
          FALSE,
          next_serial.serial,
          'B' || LPAD(next_serial.serial::text, 10, '0'),
          $1::text || '-' || ('B' || LPAD(next_serial.serial::text, 10, '0')),
          $8::uuid,
          $9::role_type
        FROM next_serial
        RETURNING
          id,
          irsaliye_no,
          product_name,
          quantity_numeric,
          quantity_unit,
          product_type,
          product_category,
          stock_entry_date,
          barcode_no,
          created_by_role,
          created_at
      `,
      [
        normalizedInput.irsaliyeNo,
        normalizedInput.productName,
        normalizedInput.quantityNumeric,
        normalizedInput.quantityUnit,
        normalizedInput.productType,
        normalizedInput.productCategory,
        normalizedInput.stockEntryDate,
        params.actorUserId,
        params.actorRole
      ]
    );

    const inserted = insertResult.rows[0];

    if (!inserted) {
      throw new AppError({
        status: 500,
        code: 'STOCK_INSERT_FAILED',
        publicMessage: 'Stok kaydı oluşturulamadı.'
      });
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
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      `,
      [
        params.actorUserId,
        'STOCK_CREATED',
        'stock',
        inserted.id,
        JSON.stringify({
          irsaliyeNo: normalizedInput.irsaliyeNo,
          productName: normalizedInput.productName,
          barcodeNo: inserted.barcode_no,
          productCategory: normalizedInput.productCategory,
          stockEntryDate: normalizedInput.stockEntryDate
        }),
        params.requestId
      ]
    );

    const warning =
      duplicateCount > 0
        ? 'Benzer bir kayıt zaten mevcut. Kayıt tekrar eklendi.'
        : null;

    return {
      item: mapStockRow(inserted),
      warning
    };
  });
}

interface UpdateStockParams {
  id: string;
  input: Partial<StockCreateInput>;
  actorUserId: string;
  requestId: string;
}

export async function updateStock(params: UpdateStockParams): Promise<StockListItem> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let irsaliyeParamIndex: number | null = null;

  if (params.input.irsaliyeNo !== undefined) {
    values.push(params.input.irsaliyeNo.trim());
    irsaliyeParamIndex = values.length;
    updates.push(`irsaliye_no = $${values.length}::varchar(64)`);
  }

  if (params.input.productName !== undefined) {
    values.push(params.input.productName.trim());
    updates.push(`product_name = $${values.length}::varchar(120)`);
  }

  if (params.input.quantityNumeric !== undefined) {
    values.push(params.input.quantityNumeric);
    updates.push(`quantity_numeric = $${values.length}::numeric`);
  }

  if (params.input.quantityUnit !== undefined) {
    values.push(params.input.quantityUnit);
    updates.push(`quantity_unit = $${values.length}::varchar(16)`);
  }

  if (params.input.productType !== undefined) {
    values.push(params.input.productType);
    updates.push(`product_type = $${values.length}::varchar(32)`);
  }

  if (params.input.productCategory !== undefined) {
    values.push(params.input.productCategory);
    updates.push(`product_category = $${values.length}::varchar(16)`);
  }

  if (params.input.stockEntryDate !== undefined) {
    values.push(params.input.stockEntryDate);
    updates.push(`stock_entry_date = $${values.length}::date`);
  }

  if (updates.length === 0) {
    throw new AppError({
      status: 400,
      code: 'EMPTY_UPDATE',
      publicMessage: 'Güncelleme için en az bir alan gönderilmelidir.'
    });
  }

  if (irsaliyeParamIndex) {
    updates.push(`combined_code = $${irsaliyeParamIndex}::text || '-' || barcode_no`);
  }

  const idIndex = values.length + 1;
  const updateSql = `
    UPDATE stocks
    SET ${updates.join(', ')}
    WHERE id = $${idIndex}::uuid
    RETURNING
      id,
      irsaliye_no,
      product_name,
      quantity_numeric,
      quantity_unit,
      product_type,
      product_category,
      stock_entry_date,
      barcode_no,
      created_by_role,
      created_at
  `;

  values.push(params.id);

  const result = await queryDb<StockRow>(updateSql, values);
  const updated = result.rows[0];

  if (!updated) {
    throw new AppError({
      status: 404,
      code: 'STOCK_NOT_FOUND',
      publicMessage: 'Stok kaydı bulunamadı.'
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
      'STOCK_UPDATED',
      'stock',
      params.id,
      JSON.stringify({
        updatedFields: Object.keys(params.input)
      }),
      params.requestId
    ]
  );

  return mapStockRow(updated);
}

interface DeleteStockParams {
  id: string;
  actorUserId: string;
  requestId: string;
}

export async function deleteStock(params: DeleteStockParams): Promise<void> {
  const result = await queryDb<{ id: string }>(
    `
      DELETE FROM stocks
      WHERE id = $1::uuid
      RETURNING id
    `,
    [params.id]
  );

  if (!result.rows[0]) {
    throw new AppError({
      status: 404,
      code: 'STOCK_NOT_FOUND',
      publicMessage: 'Stok kaydı bulunamadı.'
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
      'STOCK_DELETED',
      'stock',
      params.id,
      JSON.stringify({}),
      params.requestId
    ]
  );
}
