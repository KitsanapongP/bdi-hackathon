-- Migration 039: add Google Maps fields to content_venues

ALTER TABLE content_venues
  ADD COLUMN google_maps_url VARCHAR(2048) NULL COMMENT 'Google Maps URL for this venue' AFTER description_en,
  ADD COLUMN latitude DECIMAL(10,7) NULL COMMENT 'Latitude coordinate' AFTER google_maps_url,
  ADD COLUMN longitude DECIMAL(10,7) NULL COMMENT 'Longitude coordinate' AFTER latitude;
