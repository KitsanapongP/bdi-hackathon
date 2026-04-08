ALTER TABLE user_registration_verifications
  ADD COLUMN pending_user_id BIGINT(20) UNSIGNED NULL AFTER user_name,
  ADD COLUMN verification_link_token_hash VARCHAR(128) NOT NULL DEFAULT '' AFTER verification_code_hash;

ALTER TABLE user_registration_verifications
  ADD KEY idx_urv_pending_user_id (pending_user_id),
  ADD KEY idx_urv_link_hash (verification_link_token_hash);

ALTER TABLE user_registration_verifications
  ADD CONSTRAINT fk_urv_pending_user
    FOREIGN KEY (pending_user_id) REFERENCES user_users (user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
