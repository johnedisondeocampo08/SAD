
-- =========================================
-- SIMULA STUDIO SAMPLE DATA
-- =========================================

USE simula_studio_db;

START TRANSACTION;

-- Sample customer
INSERT INTO customer (
    customer_id,
    full_name,
    contact_number,
    email,
    address,
    notes
)
VALUES (
    'CUST001',
    'Juan Dela Cruz',
    '09123456789',
    'juan@example.com',
    'Quezon City',
    'Sample customer for testing'
);

-- Sample product variant
INSERT INTO product_variant (
    variant_id,
    variant_name,
    description,
    base_price,
    active
)
VALUES (
    'VAR001',
    'Customized Shirt - Medium',
    'Sample customized shirt',
    350.00,
    TRUE
);

-- Sample customer order
INSERT INTO customer_order (
    order_id,
    customer_id,
    order_date,
    due_date,
    status,
    payment_status,
    total_amount
)
VALUES (
    'ORD001',
    'CUST001',
    '2026-11-21',
    '2026-11-28',
    'pending',
    'unpaid',
    700.00
);

-- Sample order item
INSERT INTO order_item (
    item_id,
    order_id,
    variant_id,
    quantity,
    unit_price
)
VALUES (
    'ITEM001',
    'ORD001',
    'VAR001',
    2,
    350.00
);

COMMIT;

-- =========================================
-- VERIFY SAMPLE DATA
-- =========================================

SELECT
    co.order_id,
    c.full_name AS customer_name,
    pv.variant_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) AS subtotal,
    co.status
FROM customer_order co
JOIN customer c
    ON co.customer_id = c.customer_id
JOIN order_item oi
    ON co.order_id = oi.order_id
JOIN product_variant pv
    ON oi.variant_id = pv.variant_id;
