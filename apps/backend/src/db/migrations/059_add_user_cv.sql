-- Migration 059: add CV field to user profile for verification context
ALTER TABLE user_users
ADD COLUMN cv TEXT NULL COMMENT 'Optional CV/background text for verification and judging context'
AFTER home_province;
