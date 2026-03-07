# Hackathon Platform - Project Tasks

## ✅ ระยะที่ 1: วิเคราะห์ระบบปัจจุบัน (Completed)
- [x] Analyze Backend Structure and APIs
- [x] Analyze Frontend Structure and Pages
- [x] Document System Flow (User & Admin)
- [x] Review New Requirements & Planning

---

## 🚀 ระยะที่ 2: พัฒนาระบบเพิ่มเติมตาม Flow ใหม่ (To-Do)

### 1. ระบบจัดการการแจ้งเตือน (Notification & Email Log)
- [ ] **Infrastructure:** ติดตั้งและตั้งค่าระบบส่ง Email (เช่น Nodemailer / Resend / AWS SES)
- [ ] **DB Schema:** สร้าง/ปรับปรุงตาราง `notification_logs` และ `admin_notification_settings` (ระบบมี `notify_email_templates` อยู่แล้ว ให้เชื่อมต่อเพื่อ**แก้ไขข้อความที่จะส่งผ่าน DB**)
- [ ] **Inbox UI (Frontend):** เพิ่มเมนู "กล่องข้อความ (Inbox/Logs)" ในหน้า Team Dashboard เพื่อแสดงประวัติข้อความทั้งหมด
- [ ] **Admin Notification Settings & Templates:** เพิ่มเมนูในฝั่ง Admin ให้สามารถตั้งค่าการแจ้งเตือน และแก้ไขข้อความ/Template ที่ใช้ส่งได้

2. ระบบการคัดเลือกและยืนยันเข้าร่วม (Selection & Confirmation)
- [ ] **DB Schema (Team Status):** ไม่ต้องเพิ่ม `selection_status` แต่ให้แก้ฟิลด์ `status` เดิมในตาราง `team_teams` ให้เหลือแค่ที่ใช้งานคือ: `forming`, `submitted`, `disbanded`, `passed` (ผ่านการคัดเลือก), และ `failed` (ไม่ผ่านการคัดเลือก) พร้อมลบอันที่ไม่ได้ใช้ออก
- [ ] **DB Schema (Timestamps):** ลบฟิลด์เวลา `approved_at`, `rejected_at`, `selected_at` ออกจากตาราง `team_teams` เนื่องจากไม่ได้ใช้งานแล้ว
- [ ] **Audit Logs:** เพิ่ม Logic ในการบันทึกทุก Action (เช่น การเปลี่ยน Status ของทีม) ลงในตาราง `team_audit_logs` เพื่อเก็บประวัติการเปลี่ยนแปลง
- [ ] **Admin Selection UI:** หน้าจอสำหรับ Admin เอาไว้ประกาศผล (ปรับสถานะเป็น passed/failed) และตั้งเวลาจำกัดในการกดยืนยัน
- [ ] **Email Hook - Selection:** เมื่อประกาศผล ส่ง Email แจ้งเตือน และลง Log ในระบบให้ทุกคนในทีมรู้ผล
- [ ] **User Confirmation UI:** หน้า Team ของ Leader ฝั่ง User จะแสดงปุ่ม "ยืนยันการเข้าร่วมโครงการ" พร้อมเวลานับถอยหลัง (ถ้าหมดเวลาถือว่าสละสิทธิ์) 
- [ ] **Email Hook - Confirmation:** เมื่อ Leader ยืนยันเข้าร่วม ส่ง Email แจ้งเตือนหา Admin และทุกคนในทีม

### 3. ระบบสิทธิประโยชน์และ QR Code (Privileges & QR Scan) - *[รอทำหลังข้อ 1 และ 2 เสร็จ]*
- [ ] **DB Schema:** สร้างตาราง `privileges` (เก็บรายการสิทธิ์ เช่น เสื้อ, อาหาร, ที่พัก) และ `user_privileges_claims` (เก็บประวัติการกดรับสิทธิ์)
- [ ] **QR Code Generator:** สร้าง API สำหรับ Generate Secure Token ไปแปลงเป็น QR Code ของแต่ละคน/แต่ละสิทธิ์
- [ ] **Profile Privileges UI:** หน้า Profile ผู้ใช้เพิ่มเมนู "สิทธิประโยชน์" เพื่อดูรายการที่ได้รับและเปิด QR Code ให้พนักงานสแกน
- [ ] **Staff/Admin QR Scanner:** หน้าเว็บฝั่ง Admin สำหรับใช้กล้องมือถือ/เครื่องสแกน เพื่อ Scan QR Code และกดยืนยันการรับของ (ลงประวัติว่า Admin คนไหนเป็นคนจ่ายของ)

### 4. เชื่อมต่อ Hooks สำหรับ Email/Notification ที่มีอยู่แล้ว
- [ ] **Hook - 1.4 Identity Verification:** เพิ่มการส่ง Email หา Admin และทุกคนในทีมทันทีที่ Leader กด Submit Team Document
