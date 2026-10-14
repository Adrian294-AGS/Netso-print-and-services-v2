CREATE TABLE IF NOT EXISTS tbl_app_setting (
    setting_key   VARCHAR(100) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tbl_app_setting (setting_key, setting_value)
VALUES ('gcash_enabled', '0')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

ALTER TABLE tbl_print_order
    ADD COLUMN payment_method VARCHAR(30) NULL AFTER total_amount,
    ADD CONSTRAINT chk_print_order_payment_method CHECK (
        payment_method IS NULL OR payment_method IN ('GCash', 'Cash on Pickup')
    );
