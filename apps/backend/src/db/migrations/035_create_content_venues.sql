-- Migration 035: Create venues content tables and seed initial data

CREATE TABLE IF NOT EXISTS content_venues (
  venue_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of venue location record',
  venue_category ENUM('transportation', 'accommodation', 'attraction') NOT NULL COMMENT 'Venue category shown on website',
  venue_name_th VARCHAR(255) NOT NULL COMMENT 'Venue name (Thai)',
  venue_name_en VARCHAR(255) NULL COMMENT 'Venue name (English)',
  description_th TEXT NULL COMMENT 'Venue description (Thai)',
  description_en TEXT NULL COMMENT 'Venue description (English)',
  sort_order INT(11) NOT NULL DEFAULT 0 COMMENT 'Display order in category',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this venue is visible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (venue_id),
  UNIQUE KEY uniq_content_venues_name_category (venue_name_th, venue_category),
  KEY idx_content_venues_enabled_category_sort (is_enabled, venue_category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Venue information shown on venue page';

CREATE TABLE IF NOT EXISTS content_venue_images (
  venue_image_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary key of venue image',
  venue_id BIGINT(20) UNSIGNED NOT NULL COMMENT 'FK to content_venues.venue_id',
  image_storage_key VARCHAR(500) NOT NULL COMMENT 'Image URL/path for venue photo',
  image_alt_th VARCHAR(255) NULL COMMENT 'Image alt text (Thai)',
  image_alt_en VARCHAR(255) NULL COMMENT 'Image alt text (English)',
  sort_order INT(11) NOT NULL DEFAULT 0 COMMENT 'Image order in slider',
  is_cover TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Preferred cover image',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this image is visible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
  PRIMARY KEY (venue_image_id),
  UNIQUE KEY uniq_content_venue_images_venue_sort (venue_id, sort_order),
  KEY idx_content_venue_images_enabled_venue_sort (is_enabled, venue_id, sort_order),
  CONSTRAINT fk_content_venue_images_venue FOREIGN KEY (venue_id)
    REFERENCES content_venues (venue_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Venue images for slider display';

INSERT INTO content_venues
  (venue_id, venue_category, venue_name_th, venue_name_en, description_th, description_en, sort_order, is_enabled)
VALUES
  (
    1001,
    'accommodation',
    'โรงแรมอวานี ขอนแก่น โฮเทล แอนด์ คอนเวนชั่น เซ็นเตอร์',
    'Avani Khon Kaen Hotel & Convention Centre',
    'โรงแรมใจกลางเมือง เดินทางสะดวก มีห้องพักหลายรูปแบบ พร้อมพื้นที่จัดประชุมและสิ่งอำนวยความสะดวกครบครัน',
    'City-center hotel with convenient access, multiple room options, and full meeting facilities.',
    1,
    1
  ),
  (
    1002,
    'accommodation',
    'โรงแรมเจริญธานี ขอนแก่น',
    'Charoenthani Khon Kaen Hotel',
    'ที่พักใกล้แหล่งอาหารและศูนย์การค้า เหมาะสำหรับผู้เข้าร่วมงานที่ต้องการพักผ่อนและเดินทางต่อได้ง่าย',
    'Accommodation near food spots and shopping areas, suitable for participants who need easy onward travel.',
    2,
    1
  ),
  (
    1003,
    'transportation',
    'ท่าอากาศยานขอนแก่น',
    'Khon Kaen Airport',
    'รองรับเที่ยวบินภายในประเทศจากหลายจังหวัด มีบริการแท็กซี่ รถเช่า และรถโดยสารเข้าสู่ตัวเมือง',
    'Domestic airport with multiple routes and transport options including taxi, rental cars, and city buses.',
    1,
    1
  ),
  (
    1004,
    'transportation',
    'สถานีขนส่งผู้โดยสารจังหวัดขอนแก่น แห่งที่ 3',
    'Khon Kaen Bus Terminal 3',
    'จุดเชื่อมต่อรถโดยสารระหว่างจังหวัด มีรอบเดินทางตลอดวันและบริการรถต่อเข้าพื้นที่มหาวิทยาลัย',
    'Intercity bus terminal with all-day departures and connecting transport to university areas.',
    2,
    1
  ),
  (
    1005,
    'attraction',
    'บึงแก่นนคร',
    'Bueng Kaen Nakhon',
    'สวนสาธารณะและแหล่งพักผ่อนริมบึง เหมาะสำหรับเดินเล่นช่วงเย็นหรือถ่ายภาพบรรยากาศเมืองขอนแก่น',
    'A large public lake and park area, great for evening walks and cityscape photography.',
    1,
    1
  ),
  (
    1006,
    'attraction',
    'วัดหนองแวง (พระมหาธาตุแก่นนคร)',
    'Wat Nong Wang (Phra Mahathat Kaen Nakhon)',
    'วัดสำคัญของจังหวัดขอนแก่น โดดเด่นด้วยพระมหาธาตุ 9 ชั้น สามารถชมวิวเมืองจากจุดชมวิวด้านบน',
    'One of Khon Kaen\'s signature temples, known for its nine-story stupa and panoramic viewpoint.',
    2,
    1
  )
ON DUPLICATE KEY UPDATE
  venue_category = VALUES(venue_category),
  venue_name_en = VALUES(venue_name_en),
  description_th = VALUES(description_th),
  description_en = VALUES(description_en),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO content_venue_images
  (venue_image_id, venue_id, image_storage_key, image_alt_th, image_alt_en, sort_order, is_cover, is_enabled)
VALUES
  (
    2001,
    1001,
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1280&q=80',
    'บรรยากาศภายในโรงแรมอวานี ขอนแก่น',
    'Interior view of Avani Khon Kaen hotel',
    1,
    1,
    1
  ),
  (
    2002,
    1001,
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1280&q=80',
    'ห้องพักสำหรับผู้เข้าร่วมงาน',
    'Guest room option for participants',
    2,
    0,
    1
  ),
  (
    2003,
    1002,
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1280&q=80',
    'พื้นที่ต้อนรับของโรงแรมเจริญธานี',
    'Lobby area of Charoenthani hotel',
    1,
    1,
    1
  ),
  (
    2004,
    1002,
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1280&q=80',
    'ตัวอย่างห้องพักโรงแรม',
    'Sample hotel room interior',
    2,
    0,
    1
  ),
  (
    2005,
    1003,
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1280&q=80',
    'บริเวณอาคารผู้โดยสารสนามบิน',
    'Airport terminal area',
    1,
    1,
    1
  ),
  (
    2006,
    1003,
    'https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1280&q=80',
    'เที่ยวบินและทางเดินขึ้นเครื่อง',
    'Flight and boarding area',
    2,
    0,
    1
  ),
  (
    2007,
    1004,
    'https://images.unsplash.com/photo-1556122071-e404eaedb77f?auto=format&fit=crop&w=1280&q=80',
    'พื้นที่สถานีขนส่งและรถโดยสาร',
    'Bus terminal and coaches',
    1,
    1,
    1
  ),
  (
    2008,
    1004,
    'https://images.unsplash.com/photo-1564694202779-bc908c327862?auto=format&fit=crop&w=1280&q=80',
    'รถโดยสารสำหรับเดินทางระหว่างจังหวัด',
    'Intercity bus transportation',
    2,
    0,
    1
  ),
  (
    2009,
    1005,
    'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1280&q=80',
    'วิวบึงแก่นนครช่วงเย็น',
    'Bueng Kaen Nakhon at dusk',
    1,
    1,
    1
  ),
  (
    2010,
    1005,
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1280&q=80',
    'ทางเดินริมบึงสำหรับพักผ่อน',
    'Lakeside walkway for relaxing',
    2,
    0,
    1
  ),
  (
    2011,
    1006,
    'https://images.unsplash.com/photo-1508025690966-2a9a1957da7c?auto=format&fit=crop&w=1280&q=80',
    'พระมหาธาตุแก่นนคร วัดหนองแวง',
    'Phra Mahathat Kaen Nakhon stupa',
    1,
    1,
    1
  ),
  (
    2012,
    1006,
    'https://images.unsplash.com/photo-1523419409543-a5e549c1f0b0?auto=format&fit=crop&w=1280&q=80',
    'มุมสถาปัตยกรรมวัดและจุดชมวิว',
    'Temple architecture and viewpoint',
    2,
    0,
    1
  )
ON DUPLICATE KEY UPDATE
  image_storage_key = VALUES(image_storage_key),
  image_alt_th = VALUES(image_alt_th),
  image_alt_en = VALUES(image_alt_en),
  sort_order = VALUES(sort_order),
  is_cover = VALUES(is_cover),
  is_enabled = VALUES(is_enabled),
  updated_at = CURRENT_TIMESTAMP;
