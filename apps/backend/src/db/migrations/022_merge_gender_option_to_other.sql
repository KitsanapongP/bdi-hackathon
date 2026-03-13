-- Migration 022: merge `prefer_not_to_say` into `other` for gender field

UPDATE user_users
SET gender = 'other'
WHERE gender = 'prefer_not_to_say';

ALTER TABLE user_users
  MODIFY COLUMN gender ENUM('male','female','other') NULL COMMENT 'Gender (male/female/not specified-or-other)';
