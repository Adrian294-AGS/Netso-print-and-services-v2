import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { mysqlPool, queryRows } from '@/lib/server/mysql';
import {
  startingFrom,
  type PriceTier,
  type PricingMode,
  type ServiceOption,
} from '@/lib/pricing';

type Db = Parameters<typeof queryRows>[0];

type OptionRow = {
  service_id: number;
  option_code: string;
  label: string;
  note: string | null;
  pricing_mode: string;
  price_unit: string;
  min_qty: number;
  tiers_json: string;
  is_active: number;
} & RowDataPacket;

export type OptionInput = {
  id?: string;
  label: string;
  note?: string;
  pricingMode: PricingMode;
  unit: string;
  minQty: number;
  tiers: PriceTier[];
  available?: boolean;
};

const SEED_KEY = 'service_catalog_seed_netso_v1';

function parseTierJson(raw: string): PriceTier[] {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .map((tier) => ({ minQty: Number(tier.minQty), price: Number(tier.price) }))
      .filter((tier) => Number.isFinite(tier.minQty) && Number.isFinite(tier.price));
  } catch {
    return [];
  }
}

function rowToOption(row: OptionRow): ServiceOption {
  return {
    id: row.option_code,
    label: row.label,
    note: row.note ?? '',
    pricingMode: row.pricing_mode === 'area' ? 'area' : 'tier',
    unit: row.price_unit,
    minQty: Number(row.min_qty),
    tiers: parseTierJson(row.tiers_json),
    available: Boolean(row.is_active),
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export async function loadOptionsByService(db: Db = mysqlPool): Promise<Map<number, ServiceOption[]>> {
  const rows = await queryRows<OptionRow>(
    db,
    `SELECT service_id, option_code, label, note, pricing_mode, price_unit, min_qty, tiers_json, is_active
     FROM tbl_service_option ORDER BY service_id, sort_order, ID`,
  );
  const map = new Map<number, ServiceOption[]>();
  for (const row of rows) {
    const key = Number(row.service_id);
    const list = map.get(key) ?? [];
    list.push(rowToOption(row));
    map.set(key, list);
  }
  return map;
}

export async function loadOptionsForService(db: Db, serviceId: number): Promise<ServiceOption[]> {
  const rows = await queryRows<OptionRow>(
    db,
    `SELECT service_id, option_code, label, note, pricing_mode, price_unit, min_qty, tiers_json, is_active
     FROM tbl_service_option WHERE service_id = ? ORDER BY sort_order, ID`,
    [serviceId],
  );
  return rows.map(rowToOption);
}

export async function replaceServiceOptions(
  connection: PoolConnection,
  serviceId: number,
  options: OptionInput[],
): Promise<void> {
  await connection.execute('DELETE FROM tbl_service_option WHERE service_id = ?', [serviceId]);
  const used = new Set<string>();
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    let code = slug(option.id || option.label) || `option-${index + 1}`;
    while (used.has(code)) code = `${code.slice(0, 50)}-${index + 1}`;
    used.add(code);
    await connection.execute(
      `INSERT INTO tbl_service_option
         (service_id, option_code, label, note, pricing_mode, price_unit, min_qty, tiers_json, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        serviceId,
        code,
        option.label,
        option.note || null,
        option.pricingMode,
        option.unit,
        option.minQty,
        JSON.stringify(option.tiers),
        index,
        option.available === false ? 0 : 1,
      ],
    );
  }
}

type SeedOption = {
  code: string;
  label: string;
  note?: string;
  mode?: PricingMode;
  unit: string;
  minQty?: number;
  tiers: Array<[number, number]>;
};

type SeedService = {
  code: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  popularFor: string;
  turnaround: string;
  options: SeedOption[];
};

const pc = (code: string, label: string, price: number, extra: Partial<SeedOption> = {}): SeedOption => ({
  code,
  label,
  unit: 'per pc',
  tiers: [[1, price]],
  ...extra,
});

const SEED_SERVICES: SeedService[] = [
  {
    code: 'pvc-lamination',
    name: 'PVC ID Printing',
    category: 'Photo & ID',
    icon: 'CreditCard',
    description: 'Waterproof, durable PVC IDs in ATM card size, DepEd ID (3R) and A4 PVC sheets. Price drops with higher quantity.',
    popularFor: 'Schools, Offices & DepEd',
    turnaround: '24 Hours',
    options: [
      {
        code: 'pvc-atm',
        label: 'PVC ID - ATM card size',
        unit: 'per pc',
        tiers: [[1, 150], [6, 100], [11, 90], [21, 70], [100, 50]],
      },
      {
        code: 'deped-3r',
        label: 'DepEd ID - size 3R',
        unit: 'per pc',
        tiers: [[1, 150], [6, 130], [10, 100]],
      },
      pc('pvc-a4', 'PVC A4 size', 230),
      pc('pvc-a4-back-to-back', 'PVC A4 size, back to back', 250),
    ],
  },
  {
    code: 'lamination',
    name: 'Lamination',
    category: 'Document',
    icon: 'Layers',
    description: 'Waterproof, durable lamination for documents, photos and IDs.',
    popularFor: 'Documents & Certificates',
    turnaround: 'Same Day',
    options: [
      pc('lam-long', 'Long', 80),
      pc('lam-short', 'Short', 80),
      pc('lam-a4', 'A4', 80),
      pc('lam-half-long', 'Half long', 50),
      pc('lam-3r-4r', '3R-4R size', 40),
      pc('lam-80x110', '80x110mm', 35),
      pc('lam-atm-id', 'ATM/ID size', 30),
    ],
  },
  {
    code: 'tarpaulin',
    name: 'Tarpaulin Printing',
    category: 'Large Format',
    icon: 'FileText',
    description: 'Fast, premium-quality tarpaulin printing in standard and broken sizes, plus tricycle tarps, calendar tarps, panaflex and blackout tarps.',
    popularFor: 'Events & Business Signs',
    turnaround: 'Same Day',
    options: [
      pc('tarp-2x3', '2x3 ft', 120),
      pc('tarp-3x4', '3x4 ft', 220),
      pc('tarp-3x5', '3x5 ft', 280),
      pc('tarp-3x6', '3x6 ft', 300),
      pc('tarp-3x7', '3x7 ft', 360),
      pc('tarp-4x5', '4x5 ft', 350),
      pc('tarp-4x6', '4x6 ft', 400),
      pc('tarp-6x6', '6x6 ft', 600),
      pc('tarp-6x8', '6x8 ft', 800),
      pc('tarp-8x8', '8x8 ft', 1088),
      pc('tarp-1x2', '1x2 ft (broken size)', 50, { minQty: 2 }),
      pc('tarp-1x3', '1x3 ft (broken size)', 50),
      pc('tarp-2x4', '2x4 ft (broken size)', 180),
      pc('tarp-2x5', '2x5 ft (broken size)', 200),
      pc('tarp-tricycle', 'Trycy tarp', 45, { minQty: 20 }),
      pc('tarp-calendar', 'Calendar tarp', 40, { minQty: 30 }),
      {
        code: 'tarp-panaflex-20oz',
        label: 'Panaflex 20oz (custom size)',
        note: 'Rate ranges from P60 to P80 per sq.ft. Staff confirms the final rate.',
        mode: 'area',
        unit: 'per sq.ft',
        tiers: [[1, 60]],
      },
      {
        code: 'tarp-blackout',
        label: 'Blackout tarp (custom size)',
        note: 'Rate ranges from P30 to P50 per sq.ft. Staff confirms the final rate.',
        mode: 'area',
        unit: 'per sq.ft',
        tiers: [[1, 30]],
      },
    ],
  },
  {
    code: 'sintra',
    name: 'Sintra Board',
    category: 'Signage',
    icon: 'Layers',
    description: '5mm sintra board in A4/A3, poster sizes and free-size cuts. Rectangle cuts get the discounted per sq.inch rate.',
    popularFor: 'Signages, Posters & Displays',
    turnaround: '1-2 Days',
    options: [
      pc('sintra-a4', '5mm sintra board - A4 size', 200),
      pc('sintra-a3', '5mm sintra board - A3 size', 350),
      pc('sintra-poster-small', 'Small poster 11x17 inches', 350),
      pc('sintra-poster-medium', 'Medium poster 18x24 inches', 750),
      pc('sintra-poster-concert', 'Concert poster 24x36 inches', 1500),
      pc('sintra-poster-movie', 'Movie poster 27x40 inches', 1850),
      {
        code: 'sintra-free-size',
        label: 'Free size sintra (cut into shapes)',
        note: 'Fixed price for cut-into-shapes. Discount not applicable.',
        mode: 'area',
        unit: 'per sq.in',
        tiers: [[1, 1.75]],
      },
      {
        code: 'sintra-discounted',
        label: 'Discounted sintra (rectangle shapes only)',
        mode: 'area',
        unit: 'per sq.in',
        tiers: [[1, 1.35]],
      },
    ],
  },
  {
    code: 'sticker',
    name: 'Sticker Printing',
    category: 'Large Format',
    icon: 'Sticker',
    description: 'Waterproof, fade-resistant, machine-cut stickers for vloggers, giveaways and product labels. Minimum of 6 sheets.',
    popularFor: 'Vloggers, Giveaways & Product Labels',
    turnaround: '24 Hours',
    options: [
      {
        code: 'sticker-premium',
        label: 'Vloggers and giveaways (Premium)',
        note: 'Laminated, waterproof, machine cut. Glitter, 3D, matte, glossy or chrome texture. 15 pcs per A4 sheet.',
        unit: 'per sheet',
        minQty: 6,
        tiers: [[1, 350]],
      },
      {
        code: 'sticker-standard',
        label: 'Vloggers and giveaways (Standard)',
        note: 'Non-laminated, glossy, waterproof, machine cut. 15 pcs per A4 sheet.',
        unit: 'per sheet',
        minQty: 6,
        tiers: [[1, 280]],
      },
      {
        code: 'sticker-product-labels',
        label: 'Product labels',
        note: 'Waterproof vinyl, glossy or transparent, kiss-cut. Smaller labels fit more per sheet.',
        unit: 'per sheet',
        minQty: 6,
        tiers: [[1, 250]],
      },
    ],
  },
  {
    code: 'mugs',
    name: 'Personalized Mugs',
    category: 'Merch & Gifts',
    icon: 'Coffee',
    description: 'Printed mug with plastic and ribbon packaging, best for gifts and souvenirs. No minimum, but bigger orders get bigger discounts.',
    popularFor: 'Gifts & Souvenirs',
    turnaround: '1-2 Days',
    options: [
      {
        code: 'mug-printed',
        label: 'Printed mug + plastic with ribbon packaging',
        unit: 'per pc',
        tiers: [[1, 150], [6, 100], [11, 80], [20, 75], [399, 65]],
      },
    ],
  },
  {
    code: 'mug-addons',
    name: 'Mug Add-ons',
    category: 'Merch & Gifts',
    icon: 'Coffee',
    description: 'Boxes and gift tags for personalized mugs.',
    popularFor: 'Gift packaging',
    turnaround: '1-2 Days',
    options: [
      pc('addon-box-ribbon', 'Mug box with ribbon', 12),
      pc('addon-box-only', 'Mug box only', 10),
      pc('addon-box-window', 'Mug box (window type)', 13),
      pc('addon-gift-tag', 'Gift tag (1.8x2.3 in)', 5),
    ],
  },
  {
    code: 'rush-id',
    name: 'Rush ID Packages',
    category: 'Photo & ID',
    icon: 'UserCheck',
    description: 'All packages include free change of attire and background with face enhancement. Softcopy is free for packages P60 and above.',
    popularFor: 'Students & Applicants',
    turnaround: '15 Minutes',
    options: [
      pc('rush-tipid-50', 'Tipid package - 8 pcs 2x2', 50, { unit: 'per set' }),
      pc('rush-tipid-60', 'Tipid package - 6 pcs 2x2 + 8 pcs 1x1', 60, { unit: 'per set' }),
      pc('rush-passport', 'Passport size package - 8 pcs', 70, { unit: 'per set' }),
      pc('rush-complete', 'Complete package - 6 pcs 2x2, 5 pcs passport size, 8 pcs 1x1', 150, { unit: 'per set' }),
      pc('rush-whole-body', 'Whole body shot package - 2 pcs 3R or 4R', 150, { unit: 'per set' }),
      pc('rush-softcopy', 'Softcopy', 30, { unit: 'per set', note: 'Free for packages P60 and above.' }),
    ],
  },
  {
    code: 'photo',
    name: 'Photo Printing',
    category: 'Photo & ID',
    icon: 'Image',
    description: 'Photo printing from wallet size up to A4.',
    popularFor: 'Memories & Framing',
    turnaround: 'Same Day',
    options: [
      pc('photo-a4', 'A4', 60),
      pc('photo-8r', '8R', 60),
      pc('photo-5r', '5R', 30, { minQty: 2 }),
      pc('photo-4r', '4R', 15, { minQty: 4 }),
      pc('photo-3r', '3R', 15, { minQty: 4 }),
      {
        code: 'photo-wallet',
        label: 'Wallet size',
        note: 'Minimum of 3 pcs (P30). 9 pcs and up is P8 each.',
        unit: 'per pc',
        minQty: 3,
        tiers: [[1, 10], [9, 8]],
      },
    ],
  },
];

let ready: Promise<void> | null = null;

export function ensureServiceCatalog(): Promise<void> {
  if (!ready) {
    ready = setup().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function setup(): Promise<void> {
  await mysqlPool.execute(
    `CREATE TABLE IF NOT EXISTS tbl_service_option (
       ID           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
       service_id   BIGINT UNSIGNED NOT NULL,
       option_code  VARCHAR(60)     NOT NULL,
       label        VARCHAR(150)    NOT NULL,
       note         VARCHAR(255)    NULL,
       pricing_mode VARCHAR(10)     NOT NULL DEFAULT 'tier',
       price_unit   VARCHAR(40)     NOT NULL,
       min_qty      INT UNSIGNED    NOT NULL DEFAULT 1,
       tiers_json   TEXT            NOT NULL,
       sort_order   INT             NOT NULL DEFAULT 0,
       is_active    BOOLEAN         NOT NULL DEFAULT TRUE,
       PRIMARY KEY (ID),
       UNIQUE KEY uq_service_option_code (service_id, option_code),
       CONSTRAINT fk_service_option_service
         FOREIGN KEY (service_id) REFERENCES tbl_services (ID)
         ON DELETE CASCADE ON UPDATE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  const seeded = await queryRows<{ setting_value: string } & RowDataPacket>(
    mysqlPool,
    'SELECT setting_value FROM tbl_app_setting WHERE setting_key = ?',
    [SEED_KEY],
  );
  if (seeded.length) return;
  await seedCatalog();
  await mysqlPool.execute(
    `INSERT INTO tbl_app_setting (setting_key, setting_value) VALUES (?, 'done')
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [SEED_KEY],
  );
}

async function seedCatalog(): Promise<void> {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    for (const service of SEED_SERVICES) {
      await connection.execute(
        'INSERT INTO tbl_service_category (category_name) VALUES (?) ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)',
        [service.category],
      );
      const categories = await queryRows<{ ID: number } & RowDataPacket>(
        connection,
        'SELECT ID FROM tbl_service_category WHERE category_name = ?',
        [service.category],
      );
      const options: OptionInput[] = service.options.map((option) => ({
        id: option.code,
        label: option.label,
        note: option.note,
        pricingMode: option.mode ?? 'tier',
        unit: option.unit,
        minQty: option.minQty ?? 1,
        tiers: option.tiers.map(([minQty, price]) => ({ minQty, price })),
        available: true,
      }));
      const start = startingFrom(
        options.map((option) => ({
          id: option.id ?? '',
          label: option.label,
          note: option.note ?? '',
          pricingMode: option.pricingMode,
          unit: option.unit,
          minQty: option.minQty,
          tiers: option.tiers,
          available: true,
        })),
      );
      await connection.execute(
        `INSERT INTO tbl_services
           (service_code, category_id, service_name, description, icon_name,
            base_price, price_unit, popular_for, turnaround, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           category_id = VALUES(category_id), service_name = VALUES(service_name),
           description = VALUES(description), icon_name = VALUES(icon_name),
           base_price = VALUES(base_price), price_unit = VALUES(price_unit),
           popular_for = VALUES(popular_for), turnaround = VALUES(turnaround), is_active = 1`,
        [
          service.code,
          categories[0].ID,
          service.name,
          service.description,
          service.icon,
          start.price,
          start.unit,
          service.popularFor,
          service.turnaround,
        ],
      );
      const found = await queryRows<{ ID: number } & RowDataPacket>(
        connection,
        'SELECT ID FROM tbl_services WHERE service_code = ?',
        [service.code],
      );
      await replaceServiceOptions(connection, Number(found[0].ID), options);
    }
    await connection.execute("UPDATE tbl_services SET is_active = 0 WHERE service_code IN ('print', 'flyers')");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}