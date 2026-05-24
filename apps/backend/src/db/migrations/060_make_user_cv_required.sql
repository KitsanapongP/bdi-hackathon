-- Migration 060: make user CV required
UPDATE user_users
SET cv = ''
WHERE cv IS NULL;

ALTER TABLE user_users
MODIFY COLUMN cv TEXT NOT NULL COMMENT 'Required CV/background text for verification and judging context';
