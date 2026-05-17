CREATE TABLE IF NOT EXISTS review_team_shares (
    review_team_share_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    share_id VARCHAR(64) NOT NULL,
    team_id BIGINT UNSIGNED NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (review_team_share_id),
    UNIQUE KEY uq_team_share_id (share_id),
    KEY idx_team_active (team_id, revoked_at),
    CONSTRAINT fk_review_team_shares_team
        FOREIGN KEY (team_id) REFERENCES team_teams(team_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
