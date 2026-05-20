-- Migration 056: add user_code for verification and notification purposes

ALTER TABLE user_users
ADD COLUMN user_code VARCHAR(20) NULL COMMENT 'Unique sequential user code, e.g. CP0001';

SET @seq := (
  SELECT COALESCE(MAX(CAST(SUBSTRING(user_code, 3) AS UNSIGNED)), 0)
  FROM user_users
  WHERE user_code LIKE 'CP%'
);

UPDATE user_users
SET user_code = CONCAT('CP', LPAD(@seq := @seq + 1, 4, '0'))
WHERE user_code IS NULL
ORDER BY user_id;