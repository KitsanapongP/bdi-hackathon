ALTER TABLE user_users
  CHANGE COLUMN university_name_th institution_name_th VARCHAR(255) NULL COMMENT 'Institution name (Thai) for display/search',
  CHANGE COLUMN university_name_en institution_name_en VARCHAR(255) NULL COMMENT 'Institution name (English) for display/search',
  ADD COLUMN gender ENUM('male','female','other','prefer_not_to_say') NULL COMMENT 'Gender identity' AFTER last_name_en,
  ADD COLUMN birth_date DATE NULL COMMENT 'Date of birth' AFTER gender,
  ADD COLUMN education_level ENUM('secondary','high_school','bachelor','master','doctorate') NULL COMMENT 'Highest education level' AFTER birth_date,
  ADD COLUMN home_province VARCHAR(100) NULL COMMENT 'Home province' AFTER education_level;
