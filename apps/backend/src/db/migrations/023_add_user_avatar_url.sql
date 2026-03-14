-- Migration 023: add avatar_url for user profile image

ALTER TABLE user_users
  ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL COMMENT 'Public URL for user avatar/profile image' AFTER user_name;
