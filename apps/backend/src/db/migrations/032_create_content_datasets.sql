-- Migration 032: Create content datasets table and seed initial rows

CREATE TABLE IF NOT EXISTS content_datasets (
  dataset_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of dataset sample record',
  dataset_name VARCHAR(255) NOT NULL COMMENT 'Display name of dataset',
  owner_name VARCHAR(255) NOT NULL COMMENT 'Dataset owner/responsible team',
  attribute_number INT(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Number of attributes/columns',
  dataset_link VARCHAR(500) NULL COMMENT 'Public reference link (Kaggle/Drive/etc.)',
  domain_code ENUM('Phenome', 'Health', 'City') NOT NULL COMMENT 'Dataset domain category',
  record_count BIGINT(20) UNSIGNED NULL COMMENT 'Approximate number of records',
  sort_order INT(11) NOT NULL DEFAULT 0 COMMENT 'Display order in each domain',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this dataset sample is visible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (dataset_id),
  UNIQUE KEY uniq_content_datasets_name_domain (dataset_name, domain_code),
  KEY idx_content_datasets_enabled_domain_sort (is_enabled, domain_code, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sample datasets shown on datasets page';

INSERT INTO content_datasets
  (dataset_name, owner_name, attribute_number, dataset_link, domain_code, record_count, sort_order, is_enabled)
VALUES
  ('Thailand Phenome Snapshot', 'Phenome Working Group', 48, 'https://www.kaggle.com/datasets', 'Phenome', 120000, 1, 1),
  ('Community Health Screening', 'Health Analytics Team', 36, 'https://drive.google.com/', 'Health', 85000, 1, 1),
  ('Urban Mobility and Services', 'Smart City Operations', 29, 'https://data.go.th/', 'City', 240000, 1, 1)
ON DUPLICATE KEY UPDATE
  owner_name = VALUES(owner_name),
  attribute_number = VALUES(attribute_number),
  dataset_link = VALUES(dataset_link),
  record_count = VALUES(record_count),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled),
  updated_at = CURRENT_TIMESTAMP;
