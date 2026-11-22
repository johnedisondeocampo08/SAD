const db = require('../config/db');

async function ensureColumn(table, column, definition) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS column_count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (Number(rows[0].column_count) === 0) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function initializeDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS owner_account (
      owner_id CHAR(36) PRIMARY KEY,
      display_name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(180) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS owner_session (
      session_id CHAR(36) PRIMARY KEY,
      owner_id CHAR(36) NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_owner_session_account FOREIGN KEY (owner_id)
        REFERENCES owner_account(owner_id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS owner_setup_lock (
      lock_id TINYINT PRIMARY KEY,
      locked_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB
  `);
  await db.query('INSERT IGNORE INTO owner_setup_lock (lock_id) VALUES (1)');
  await db.query(`
    CREATE TABLE IF NOT EXISTS workspace_state (
      state_id TINYINT PRIMARY KEY,
      state_json JSON NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  const columns = [
    ['customer', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['product_variant', 'product_type', "VARCHAR(30) NOT NULL DEFAULT 'Souvenir'"],
    ['product_variant', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['material', 'unit_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0'],
    ['material', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['customer_order', 'shipping_fee', 'DECIMAL(12,2) NOT NULL DEFAULT 0'],
    ['customer_order', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['order_item', 'active', 'BOOLEAN NOT NULL DEFAULT TRUE'],
    ['order_item', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['payment', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['production_batch', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['production_batch', 'variant_id', 'VARCHAR(20) NULL'],
    ['inventory_movement', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['expense', 'created_by_owner_id', 'CHAR(36) NULL'],
    ['expense', 'installment_months', 'INT NULL'],
    ['expense', 'start_month', 'CHAR(7) NULL'],
    ['expense', 'paid_months', 'JSON NULL']
  ];
  for (const [table, column, definition] of columns) {
    await ensureColumn(table, column, definition);
  }
  const [batchItemColumn] = await db.query(
    `SELECT IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'production_batch'
       AND COLUMN_NAME = 'item_id'`
  );
  if (batchItemColumn[0]?.IS_NULLABLE === 'NO') {
    await db.query('ALTER TABLE production_batch MODIFY item_id VARCHAR(20) NULL');
  }
  const [batchVariantForeignKey] = await db.query(
    `SELECT COUNT(*) AS constraint_count
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = 'production_batch'
       AND CONSTRAINT_NAME = 'fk_batch_variant'
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
  );
  if (Number(batchVariantForeignKey[0].constraint_count) === 0) {
    await db.query(`ALTER TABLE production_batch
      ADD CONSTRAINT fk_batch_variant FOREIGN KEY (variant_id)
      REFERENCES product_variant(variant_id)`);
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS variant_material_recipe (
      variant_id VARCHAR(20) NOT NULL,
      material_id VARCHAR(20) NOT NULL,
      qty_per_item DECIMAL(12,3) NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (variant_id, material_id),
      CONSTRAINT fk_recipe_variant FOREIGN KEY (variant_id)
        REFERENCES product_variant(variant_id),
      CONSTRAINT fk_recipe_material FOREIGN KEY (material_id)
        REFERENCES material(material_id),
      CONSTRAINT chk_recipe_quantity CHECK (qty_per_item > 0)
    ) ENGINE=InnoDB
  `);
  try {
    await db.query('ALTER TABLE workspace_state ADD COLUMN version BIGINT NOT NULL DEFAULT 0');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }
}

module.exports = initializeDatabase;
