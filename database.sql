-- NETSO Prints & Ads schema for MySQL 8.0.16+ / MariaDB 10.2.1+.
-- Select the target database before importing this file.
-- This is a non-destructive bootstrap: it creates missing tables, but does not
-- migrate or alter existing tables. Use reviewed, versioned migrations for an
-- existing installation. Application code must generate tbl_user.UID UUIDs.

CREATE TABLE IF NOT EXISTS tbl_user (
    UID              CHAR(36)     NOT NULL,
    username         VARCHAR(50)  NULL,
    email            VARCHAR(254) NULL,
    password_hash    VARCHAR(255) NULL,
    role             VARCHAR(32)  NOT NULL DEFAULT 'customer',
    first_name       VARCHAR(75)  NULL,
    middle_name      VARCHAR(75)  NULL,
    last_name        VARCHAR(75)  NULL,
    mobile_number    VARCHAR(32)  NULL,
    account_status   VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (UID),
    UNIQUE KEY uq_user_username (username),
    UNIQUE KEY uq_user_email (email),
    KEY idx_user_role_status (role, account_status),
    CONSTRAINT chk_user_role CHECK (
        role IN ('customer', 'lead_admin', 'print_operator',
                 'pre_press_artist', 'front_desk_cashier')
    ),
    CONSTRAINT chk_user_account_status CHECK (
        account_status IN ('active', 'suspended', 'disabled')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Address is separate from credentials and permits more than one address per user.
CREATE TABLE IF NOT EXISTS tbl_user_address (
    ID             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        CHAR(36)        NOT NULL,
    address_label  VARCHAR(40)     NOT NULL DEFAULT 'Primary',
    street         VARCHAR(150)    NULL,
    barangay       VARCHAR(100)    NULL,
    municipality   VARCHAR(100)    NULL,
    province       VARCHAR(100)    NULL,
    zip_code       VARCHAR(12)     NULL,
    is_primary     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                   ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    KEY idx_user_address_user (user_id),
    CONSTRAINT fk_user_address_user
        FOREIGN KEY (user_id) REFERENCES tbl_user (UID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_oauth_account (
    ID                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id           CHAR(36)        NOT NULL,
    provider          VARCHAR(40)     NOT NULL,
    provider_user_id  VARCHAR(191)    NOT NULL,
    created_at        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                   ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_oauth_provider_account (provider, provider_user_id),
    KEY idx_oauth_user_id (user_id),
    CONSTRAINT fk_oauth_user
        FOREIGN KEY (user_id) REFERENCES tbl_user (UID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_staff_profile (
    ID             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        CHAR(36)        NOT NULL,
    staff_code     VARCHAR(32)     NOT NULL,
    shift_start    TIME            NULL,
    shift_end      TIME            NULL,
    work_status    VARCHAR(20)     NOT NULL DEFAULT 'off_duty',
    created_at     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                   ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_staff_user (user_id),
    UNIQUE KEY uq_staff_code (staff_code),
    CONSTRAINT chk_staff_work_status CHECK (
        work_status IN ('online', 'in_production', 'off_duty')
    ),
    CONSTRAINT fk_staff_user
        FOREIGN KEY (user_id) REFERENCES tbl_user (UID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_service_category (
    ID             SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_name  VARCHAR(60)       NOT NULL,
    created_at     DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_service_category_name (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_services (
    ID              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    service_code    VARCHAR(50)      NOT NULL,
    category_id     SMALLINT UNSIGNED NOT NULL,
    service_name    VARCHAR(150)     NOT NULL,
    description     TEXT             NOT NULL,
    icon_name       VARCHAR(50)      NULL,
    base_price      DECIMAL(10,2)    NOT NULL,
    price_unit      VARCHAR(40)      NOT NULL,
    popular_for     VARCHAR(100)     NULL,
    turnaround      VARCHAR(40)      NOT NULL,
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                    ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_services_code (service_code),
    KEY idx_services_category_active (category_id, is_active),
    CONSTRAINT chk_services_base_price CHECK (base_price >= 0),
    CONSTRAINT fk_services_category
        FOREIGN KEY (category_id) REFERENCES tbl_service_category (ID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalog defaults correspond to the customer and admin service catalog inputs.
INSERT INTO tbl_service_category (category_name) VALUES
    ('Document'),
    ('Photo & ID'),
    ('Large Format'),
    ('Signage'),
    ('Merch & Gifts'),
    ('Marketing')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

INSERT INTO tbl_services
    (service_code, category_id, service_name, description, icon_name,
     base_price, price_unit, popular_for, turnaround)
VALUES
    ('tarpaulin',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Large Format'),
     'Tarpaulin Banner',
     'Heavy-duty outdoor event banners, birthday backdrops & billboard prints with metal eyelets.',
     'FileText', 18.00, 'per sq.ft', 'Events & Business Signs', 'Same Day'),
    ('sticker',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Large Format'),
     'Sticker Printing & Decals',
     'Waterproof vinyl, glossy/matte die-cut labels for product packaging, bottles & vehicles.',
     'Sticker', 25.00, 'per sq.ft', 'Products & Branding', '24 Hours'),
    ('rush-id',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Photo & ID'),
     'Rush ID Photos',
     'Package includes 1x1, 2x2 & Passport size photos with formal attire edit & digital copy.',
     'UserCheck', 80.00, 'per set (6pcs)', 'Students & Applicants', '15 Minutes'),
    ('sintra',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Signage'),
     'Sintra Board Signages',
     '3mm / 5mm rigid waterproof board mounting for menu boards, exhibits & wall decor.',
     'Layers', 120.00, 'per sq.ft', 'Stores & Restaurants', '1-2 Days'),
    ('print',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Document'),
     'Doc Printing & Xerox',
     'High-speed black & white and full-color document printing for thesis, reports & legal forms.',
     'Printer', 2.00, 'per page', 'Students & Offices', 'Instant'),
    ('photo',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Photo & ID'),
     'Photo Printing',
     'Premium glossy or satin photo printouts in 4R, 5R, 8R, A4, and poster sizes.',
     'Image', 15.00, 'per photo', 'Memories & Framing', 'Same Day'),
    ('pvc-lamination',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Photo & ID'),
     'PVC Cards & Lamination',
     'Durable plastic school/company IDs, membership cards, and hot pouch paper lamination.',
     'CreditCard', 50.00, 'per piece', 'Schools & Corporate', '24 Hours'),
    ('mugs',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Merch & Gifts'),
     'Sublimation Mugs & Giveaways',
     'Personalized ceramic white mugs, magic heat-change mugs, and tumblers with custom artwork.',
     'Coffee', 150.00, 'per mug', 'Gifts & Souvenirs', '1-2 Days'),
    ('flyers',
     (SELECT ID FROM tbl_service_category WHERE category_name = 'Marketing'),
     'Flyers & Marketing Brochures',
     'Full-color promotional flyers, bi-fold/tri-fold brochures on glossy art paper.',
     'Copy', 8.00, 'per piece', 'Promotions & Campaign', '1-2 Days')
ON DUPLICATE KEY UPDATE
    service_code = VALUES(service_code);

-- Customer and service names/prices are snapshots so profile/catalog edits do
-- not rewrite historical orders. Paid and outstanding totals are derived from
-- verified payments rather than stored redundantly on the order.
CREATE TABLE IF NOT EXISTS tbl_print_order (
    ID                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_number         VARCHAR(32)     NOT NULL,
    user_id              CHAR(36)        NULL,
    service_id           BIGINT UNSIGNED NOT NULL,
    customer_name        VARCHAR(225)    NOT NULL,
    customer_email       VARCHAR(254)    NULL,
    customer_phone       VARCHAR(32)     NULL,
    service_name_snapshot VARCHAR(150)   NOT NULL,
    unit_price            DECIMAL(10,2)  NOT NULL,
    quantity              INT UNSIGNED   NOT NULL DEFAULT 1,
    page_count            INT UNSIGNED   NULL,
    paper_size            VARCHAR(100)   NULL,
    color_mode            VARCHAR(30)    NULL,
    finish                VARCHAR(255)   NULL,
    notes                 TEXT           NULL,
    total_amount          DECIMAL(10,2)  NOT NULL,
    status                VARCHAR(32)    NOT NULL DEFAULT 'Unpaid Balance',
    progress_stage        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    created_at            DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at            DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                       ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_print_order_number (order_number),
    KEY idx_print_order_user_created (user_id, created_at),
    KEY idx_print_order_service (service_id),
    KEY idx_print_order_status_created (status, created_at),
    CONSTRAINT chk_print_order_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_print_order_quantity CHECK (quantity > 0),
    CONSTRAINT chk_print_order_total CHECK (total_amount >= 0),
    CONSTRAINT chk_print_order_progress CHECK (progress_stage BETWEEN 1 AND 4),
    CONSTRAINT chk_print_order_status CHECK (
        status IN ('Unpaid Balance', 'In Pre-Press', 'In Production',
                   'Ready for Pickup', 'Completed', 'Cancelled')
    ),
    CONSTRAINT fk_print_order_user
        FOREIGN KEY (user_id) REFERENCES tbl_user (UID)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_print_order_service
        FOREIGN KEY (service_id) REFERENCES tbl_services (ID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_print_order_file (
    ID                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    print_order_id      BIGINT UNSIGNED NOT NULL,
    original_file_name  VARCHAR(255)    NOT NULL,
    file_extension      VARCHAR(20)     NULL,
    mime_type           VARCHAR(127)    NULL,
    file_size_bytes     BIGINT UNSIGNED NULL,
    storage_key         VARCHAR(512)    NULL,
    created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    KEY idx_order_file_order (print_order_id),
    CONSTRAINT fk_order_file_order
        FOREIGN KEY (print_order_id) REFERENCES tbl_print_order (ID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_checkout_session (
    ID                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    print_order_id        BIGINT UNSIGNED NOT NULL,
    provider              VARCHAR(30)     NOT NULL DEFAULT 'paymongo',
    provider_session_id   VARCHAR(191)    NULL,
    checkout_url          TEXT            NULL,
    amount                DECIMAL(10,2)   NOT NULL,
    currency              CHAR(3)         NOT NULL DEFAULT 'PHP',
    status                VARCHAR(20)     NOT NULL DEFAULT 'pending',
    expires_at            DATETIME(3)     NULL,
    created_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                         ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_checkout_provider_session (provider, provider_session_id),
    KEY idx_checkout_order_created (print_order_id, created_at),
    CONSTRAINT chk_checkout_amount CHECK (amount >= 0),
    CONSTRAINT chk_checkout_status CHECK (
        status IN ('pending', 'completed', 'expired', 'cancelled', 'failed')
    ),
    CONSTRAINT fk_checkout_print_order
        FOREIGN KEY (print_order_id) REFERENCES tbl_print_order (ID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_payments (
    ID                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    transaction_number    VARCHAR(32)     NULL,
    print_order_id        BIGINT UNSIGNED NOT NULL,
    checkout_session_id   BIGINT UNSIGNED NULL,
    provider              VARCHAR(30)     NULL,
    provider_payment_id   VARCHAR(191)    NULL,
    external_reference    VARCHAR(100)    NULL,
    payment_type          VARCHAR(30)     NOT NULL,
    method                VARCHAR(30)     NOT NULL,
    amount                DECIMAL(10,2)   NOT NULL,
    currency              CHAR(3)         NOT NULL DEFAULT 'PHP',
    status                VARCHAR(20)     NOT NULL DEFAULT 'pending',
    paid_at               DATETIME(3)     NULL,
    verified_by           CHAR(36)        NULL,
    created_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                         ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_payment_transaction_number (transaction_number),
    UNIQUE KEY uq_payment_provider_id (provider, provider_payment_id),
    KEY idx_payments_order_created (print_order_id, created_at),
    KEY idx_payments_checkout (checkout_session_id),
    KEY idx_payments_status_created (status, created_at),
    CONSTRAINT chk_payment_type CHECK (
        payment_type IN ('full_payment', 'deposit', 'balance_settlement')
    ),
    CONSTRAINT chk_payment_method CHECK (
        method IN ('GCash', 'GCash QR', 'Cash on Pickup')
    ),
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_status CHECK (
        status IN ('pending', 'verified', 'flagged', 'failed', 'refunded')
    ),
    CONSTRAINT fk_payment_order
        FOREIGN KEY (print_order_id) REFERENCES tbl_print_order (ID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payment_checkout
        FOREIGN KEY (checkout_session_id) REFERENCES tbl_checkout_session (ID)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_payment_verifier
        FOREIGN KEY (verified_by) REFERENCES tbl_user (UID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_print_order_status_history (
    ID                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    print_order_id    BIGINT UNSIGNED NOT NULL,
    previous_status   VARCHAR(32)     NULL,
    new_status        VARCHAR(32)     NOT NULL,
    note              TEXT            NULL,
    changed_by        CHAR(36)        NULL,
    changed_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    KEY idx_order_history_order_time (print_order_id, changed_at),
    CONSTRAINT fk_order_history_order
        FOREIGN KEY (print_order_id) REFERENCES tbl_print_order (ID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_order_history_user
        FOREIGN KEY (changed_by) REFERENCES tbl_user (UID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_webhook_event_log (
    ID                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider            VARCHAR(30)     NOT NULL DEFAULT 'paymongo',
    provider_event_id   VARCHAR(191)    NOT NULL,
    event_type          VARCHAR(100)    NOT NULL,
    payment_id          BIGINT UNSIGNED NULL,
    payload             JSON            NOT NULL,
    processing_status   VARCHAR(20)     NOT NULL DEFAULT 'pending',
    processing_error    TEXT            NULL,
    received_at         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    processed_at        DATETIME(3)     NULL,
    PRIMARY KEY (ID),
    UNIQUE KEY uq_webhook_provider_event (provider, provider_event_id),
    KEY idx_webhook_payment (payment_id),
    KEY idx_webhook_processing (processing_status, received_at),
    CONSTRAINT chk_webhook_processing_status CHECK (
        processing_status IN ('pending', 'processed', 'failed')
    ),
    CONSTRAINT fk_webhook_payment
        FOREIGN KEY (payment_id) REFERENCES tbl_payments (ID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_message_thread (
    ID                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    thread_number     VARCHAR(50)     NOT NULL,
    print_order_id    BIGINT UNSIGNED NOT NULL,
    status            VARCHAR(20)     NOT NULL DEFAULT 'UNREAD',
    created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                     ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    UNIQUE KEY uq_message_thread_number (thread_number),
    UNIQUE KEY uq_message_thread_order (print_order_id),
    CONSTRAINT chk_message_thread_status CHECK (
        status IN ('UNREAD', 'Replied', 'Closed')
    ),
    CONSTRAINT fk_message_thread_order
        FOREIGN KEY (print_order_id) REFERENCES tbl_print_order (ID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_chat_message (
    ID                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    thread_id         BIGINT UNSIGNED NOT NULL,
    sender_user_id    CHAR(36)        NULL,
    sender_name       VARCHAR(150)    NOT NULL,
    is_staff          BOOLEAN         NOT NULL DEFAULT FALSE,
    message_text      TEXT            NOT NULL,
    created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    KEY idx_chat_thread_time (thread_id, created_at),
    CONSTRAINT fk_chat_message_thread
        FOREIGN KEY (thread_id) REFERENCES tbl_message_thread (ID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_chat_message_sender
        FOREIGN KEY (sender_user_id) REFERENCES tbl_user (UID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only audit records; user details remain available if the account is removed.
CREATE TABLE IF NOT EXISTS tbl_logs (
    ID              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         CHAR(36)        NULL,
    actor_name      VARCHAR(150)    NULL,
    username        VARCHAR(50)     NULL,
    actor_role      VARCHAR(32)     NULL,
    category        VARCHAR(50)     NOT NULL,
    activity        VARCHAR(100)    NOT NULL,
    details         TEXT            NULL,
    target_id       VARCHAR(100)    NULL,
    ip_address      VARCHAR(45)     NULL,
    device          VARCHAR(255)    NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'Success',
    created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (ID),
    KEY idx_logs_user_created (user_id, created_at),
    KEY idx_logs_category_created (category, created_at),
    KEY idx_logs_target (target_id),
    CONSTRAINT chk_logs_status CHECK (
        status IN ('Success', 'Verified', 'Warning', 'Failed')
    ),
    CONSTRAINT fk_logs_user
        FOREIGN KEY (user_id) REFERENCES tbl_user (UID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
