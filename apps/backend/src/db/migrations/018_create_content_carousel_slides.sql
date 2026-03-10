-- Migration 018: Create homepage carousel slides content table

CREATE TABLE IF NOT EXISTS content_carousel_slides (
  slide_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of carousel slide record',
  title_th VARCHAR(255) NULL COMMENT 'Slide title in Thai for homepage caption',
  title_en VARCHAR(255) NULL COMMENT 'Slide title in English for homepage caption',
  description_th TEXT NULL COMMENT 'Slide description in Thai for homepage caption',
  description_en TEXT NULL COMMENT 'Slide description in English for homepage caption',
  image_storage_key VARCHAR(500) NOT NULL COMMENT 'Image path or storage key used to render slide image',
  image_alt_th VARCHAR(255) NULL COMMENT 'Thai alt text for image accessibility',
  image_alt_en VARCHAR(255) NULL COMMENT 'English alt text for image accessibility',
  target_url VARCHAR(500) NULL COMMENT 'Optional URL opened when user clicks this slide',
  open_in_new_tab TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether target_url should open in a new browser tab',
  sort_order INT(11) NOT NULL DEFAULT 0 COMMENT 'Display order in carousel (lower comes first)',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this slide is active on homepage',
  start_at DATETIME NULL COMMENT 'Optional publish start datetime (NULL means no start limit)',
  end_at DATETIME NULL COMMENT 'Optional publish end datetime (NULL means no end limit)',
  created_by_user_id BIGINT(20) UNSIGNED NULL COMMENT 'Admin user who created this slide',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (slide_id),
  KEY idx_content_carousel_enabled_sort (is_enabled, sort_order),
  KEY idx_content_carousel_publish_window (start_at, end_at),
  KEY idx_content_carousel_created_by (created_by_user_id),
  CONSTRAINT fk_content_carousel_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES user_users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Homepage carousel slides managed from admin';
