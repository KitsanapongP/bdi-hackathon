-- Migration 065: add optimized thumbnail path to gallery photos

ALTER TABLE content_gallery_photos
  ADD COLUMN thumb_storage_key VARCHAR(500) NULL
    COMMENT 'Optimized thumbnail image path (used by the homepage thumbnail strip)'
    AFTER image_storage_key;
