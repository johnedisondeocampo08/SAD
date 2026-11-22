
-- =============================================
-- SIMULA STUDIO MANAGEMENT SYSTEM
-- COMPLETE DATABASE SCHEMA
-- MySQL 8.0+
-- =============================================

CREATE DATABASE IF NOT EXISTS simula_studio_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE simula_studio_db;

-- 1. CUSTOMER
CREATE TABLE IF NOT EXISTS customer (
    customer_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    notes TEXT,
    created_by_owner_id CHAR(36) NULL
) ENGINE=InnoDB;

-- 2. PRODUCT VARIANT
CREATE TABLE IF NOT EXISTS product_variant (
    variant_id VARCHAR(20) PRIMARY KEY,
    variant_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    product_type VARCHAR(30) NOT NULL DEFAULT 'Souvenir',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_owner_id CHAR(36) NULL,
    CONSTRAINT chk_variant_price
        CHECK (base_price >= 0)
) ENGINE=InnoDB;

-- 3. MATERIAL
CREATE TABLE IF NOT EXISTS material (
    material_id VARCHAR(20) PRIMARY KEY,
    material_name VARCHAR(150) NOT NULL UNIQUE,
    unit VARCHAR(30) NOT NULL,
    stock_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    low_stock_threshold DECIMAL(12,3)
        NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_owner_id CHAR(36) NULL,
    CONSTRAINT chk_material_stock
        CHECK (stock_qty >= 0),
    CONSTRAINT chk_material_threshold
        CHECK (low_stock_threshold >= 0)
) ENGINE=InnoDB;

-- A product recipe defines the adjustable raw material use per one item.
CREATE TABLE IF NOT EXISTS variant_material_recipe (
    variant_id VARCHAR(20) NOT NULL,
    material_id VARCHAR(20) NOT NULL,
    qty_per_item DECIMAL(12,3) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (variant_id, material_id),
    CONSTRAINT fk_recipe_variant
        FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id),
    CONSTRAINT fk_recipe_material
        FOREIGN KEY (material_id) REFERENCES material(material_id),
    CONSTRAINT chk_recipe_quantity
        CHECK (qty_per_item > 0)
) ENGINE=InnoDB;

-- 4. CUSTOMER ORDER
CREATE TABLE IF NOT EXISTS customer_order (
    order_id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    order_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(30)
        NOT NULL DEFAULT 'unpaid',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_by_owner_id CHAR(36) NULL,

    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer(customer_id),

    CONSTRAINT chk_order_total
        CHECK (total_amount >= 0)
) ENGINE=InnoDB;

-- 5. ORDER ITEM
CREATE TABLE IF NOT EXISTS order_item (
    item_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    variant_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_owner_id CHAR(36) NULL,

    CONSTRAINT fk_item_order
        FOREIGN KEY (order_id)
        REFERENCES customer_order(order_id),

    CONSTRAINT fk_item_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variant(variant_id),

    CONSTRAINT chk_item_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_item_price
        CHECK (unit_price >= 0)
) ENGINE=InnoDB;

-- 6. PAYMENT
CREATE TABLE IF NOT EXISTS payment (
    payment_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(100),
    created_by_owner_id CHAR(36) NULL,

    CONSTRAINT fk_payment_order
        FOREIGN KEY (order_id)
        REFERENCES customer_order(order_id),

    CONSTRAINT chk_payment_amount
        CHECK (amount > 0)
) ENGINE=InnoDB;

-- 7. PRODUCTION BATCH
CREATE TABLE IF NOT EXISTS production_batch (
    batch_id VARCHAR(20) PRIMARY KEY,
    item_id VARCHAR(20),
    variant_id VARCHAR(20),
    quantity_produced INT NOT NULL,
    produced_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    created_by_owner_id CHAR(36) NULL,

    CONSTRAINT fk_batch_item
        FOREIGN KEY (item_id)
        REFERENCES order_item(item_id),

    CONSTRAINT fk_batch_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variant(variant_id),

    CONSTRAINT chk_batch_quantity
        CHECK (quantity_produced > 0)
) ENGINE=InnoDB;

-- 8. BATCH MATERIAL USAGE
CREATE TABLE IF NOT EXISTS batch_material_usage (
    usage_id VARCHAR(20) PRIMARY KEY,
    batch_id VARCHAR(20) NOT NULL,
    material_id VARCHAR(20) NOT NULL,
    qty_used DECIMAL(12,3) NOT NULL,

    CONSTRAINT fk_usage_batch
        FOREIGN KEY (batch_id)
        REFERENCES production_batch(batch_id),

    CONSTRAINT fk_usage_material
        FOREIGN KEY (material_id)
        REFERENCES material(material_id),

    CONSTRAINT chk_usage_quantity
        CHECK (qty_used > 0)
) ENGINE=InnoDB;

-- 9. INVENTORY MOVEMENT
CREATE TABLE IF NOT EXISTS inventory_movement (
    movement_id VARCHAR(20) PRIMARY KEY,
    material_id VARCHAR(20) NOT NULL,
    batch_id VARCHAR(20),
    movement_type VARCHAR(30) NOT NULL,
    quantity_change DECIMAL(12,3) NOT NULL,
    reason TEXT,
    created_by_owner_id CHAR(36) NULL,
    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movement_material
        FOREIGN KEY (material_id)
        REFERENCES material(material_id),

    CONSTRAINT fk_movement_batch
        FOREIGN KEY (batch_id)
        REFERENCES production_batch(batch_id),

    CONSTRAINT chk_movement_quantity
        CHECK (quantity_change <> 0)
) ENGINE=InnoDB;

-- 10. EXPENSE
CREATE TABLE IF NOT EXISTS expense (
    expense_id VARCHAR(20) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50),
    receipt_url TEXT,
    created_by_owner_id CHAR(36) NULL,

    CONSTRAINT chk_expense_amount
        CHECK (amount >= 0)
) ENGINE=InnoDB;

-- 11. OWNER ACCOUNTS
-- The first-run owner setup creates exactly two accounts; public sign-up is closed.
CREATE TABLE IF NOT EXISTS owner_account (
    owner_id CHAR(36) PRIMARY KEY,
    display_name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(180) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. OWNER SESSIONS
CREATE TABLE IF NOT EXISTS owner_session (
    session_id CHAR(36) PRIMARY KEY,
    owner_id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_owner_session_account
        FOREIGN KEY (owner_id) REFERENCES owner_account(owner_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. FIRST-RUN SETUP LOCK
CREATE TABLE IF NOT EXISTS owner_setup_lock (
    lock_id TINYINT PRIMARY KEY,
    locked_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO owner_setup_lock (lock_id) VALUES (1);

-- 14. DURABLE BUSINESS WORKSPACE
CREATE TABLE IF NOT EXISTS workspace_state (
    state_id TINYINT PRIMARY KEY,
    state_json JSON NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- VERIFY DATABASE TABLES
-- =============================================

SHOW TABLES;
