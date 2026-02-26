INSERT INTO `content_rewards` (
  `reward_rank`,
  `reward_name_th`,
  `reward_name_en`,
  `prize_amount`,
  `prize_currency`,
  `prize_text_th`,
  `prize_text_en`,
  `description_th`,
  `description_en`,
  `sort_order`,
  `is_enabled`
) VALUES
('1', 'รางวัลชนะเลิศ', 'Champion', 50000.00, 'บาท', 'พร้อมถ้วย', 'with trophy', NULL, NULL, 1, 1),
('2', 'รางวัลรองชนะเลิศอันดับ 1', '1st Runner-up', 30000.00, 'บาท', NULL, NULL, NULL, NULL, 2, 1),
('3', 'รางวัลรองชนะเลิศอันดับ 2', '2nd Runner-up', 20000.00, 'บาท', NULL, NULL, NULL, NULL, 3, 1);
