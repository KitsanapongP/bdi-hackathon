ALTER TABLE content_contacts
    ADD COLUMN contact_category ENUM('event_inquiry', 'dataset_inquiry', 'tech_it', 'facility')
    NOT NULL DEFAULT 'event_inquiry' AFTER contact_id;

UPDATE content_contacts
SET contact_category = 'event_inquiry'
WHERE contact_category IS NULL OR contact_category = '';
