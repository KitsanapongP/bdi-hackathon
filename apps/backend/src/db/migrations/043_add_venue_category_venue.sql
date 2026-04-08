-- Migration 038: add `venue` option to content_venues.venue_category enum

ALTER TABLE content_venues
  MODIFY COLUMN venue_category ENUM('venue', 'transportation', 'accommodation', 'attraction')
  NOT NULL
  COMMENT 'Venue category shown on website';
