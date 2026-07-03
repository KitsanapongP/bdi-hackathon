-- Migration 064: Create homepage atmosphere gallery photos content table

CREATE TABLE IF NOT EXISTS content_gallery_photos (
  photo_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of gallery photo record',
  caption_th VARCHAR(255) NULL COMMENT 'Short photo caption in Thai for homepage gallery',
  caption_en VARCHAR(255) NULL COMMENT 'Short photo caption in English for homepage gallery',
  image_storage_key VARCHAR(500) NOT NULL COMMENT 'Image path or storage key used to render gallery photo',
  image_alt_th VARCHAR(255) NULL COMMENT 'Thai alt text for image accessibility',
  image_alt_en VARCHAR(255) NULL COMMENT 'English alt text for image accessibility',
  sort_order INT(11) NOT NULL DEFAULT 0 COMMENT 'Display order in gallery (lower comes first)',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this photo is active on homepage',
  start_at DATETIME NULL COMMENT 'Optional publish start datetime (NULL means no start limit)',
  end_at DATETIME NULL COMMENT 'Optional publish end datetime (NULL means no end limit)',
  created_by_user_id BIGINT(20) UNSIGNED NULL COMMENT 'Admin user who created this photo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (photo_id),
  KEY idx_content_gallery_enabled_sort (is_enabled, sort_order),
  KEY idx_content_gallery_publish_window (start_at, end_at),
  KEY idx_content_gallery_created_by (created_by_user_id),
  CONSTRAINT fk_content_gallery_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES user_users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Homepage atmosphere gallery photos managed from admin';
