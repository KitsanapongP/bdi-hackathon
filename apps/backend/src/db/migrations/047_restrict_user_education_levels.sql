-- Migration 047: keep only high_school and bachelor education levels

UPDATE `user_users`
SET `education_level` = 'high_school'
WHERE `education_level` = 'secondary';

UPDATE `user_users`
SET `education_level` = 'bachelor'
WHERE `education_level` IN ('master', 'doctorate');

ALTER TABLE `user_users`
  MODIFY COLUMN `education_level` ENUM('high_school','bachelor') DEFAULT NULL COMMENT 'Highest education level';
