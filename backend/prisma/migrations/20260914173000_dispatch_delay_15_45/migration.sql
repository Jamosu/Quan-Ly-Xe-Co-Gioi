UPDATE `alert_rules`
SET
  `name` = 'Lệnh điều xe trễ xuất phát 15 phút',
  `description` = 'Lệnh quá 15 phút chưa xuất phát.',
  `configJson` = JSON_OBJECT('delayMinutes', 15),
  `updatedAt` = NOW(3)
WHERE `code` = 'DISPATCH_DELAYED';

INSERT INTO `alert_rules` (
  `code`, `name`, `description`, `category`, `severity`, `status`, `configJson`, `createdAt`, `updatedAt`
)
VALUES (
  'DISPATCH_REOPENED',
  'Mở lại lệnh điều xe trễ 45 phút',
  'Cảnh báo lần hai, thu hồi tài xế cũ và đưa lệnh vào danh sách mở nếu sau cảnh báo đầu 30 phút vẫn chưa xuất phát.',
  'DISPATCH',
  'CRITICAL',
  'ACTIVE',
  JSON_OBJECT('firstWarningMinutes', 15, 'reopenAfterAdditionalMinutes', 30, 'totalMinutes', 45),
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `severity` = VALUES(`severity`),
  `status` = VALUES(`status`),
  `configJson` = VALUES(`configJson`),
  `updatedAt` = VALUES(`updatedAt`);
