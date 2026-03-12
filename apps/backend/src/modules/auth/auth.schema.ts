import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    phone: z.string().min(9, 'กรุณากรอกเบอร์โทรศัพท์').max(15, 'เบอร์โทรศัพท์ยาวเกินไป'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    userName: z.string().min(3, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร').max(50),
    firstNameTh: z.string().min(1, 'กรุณากรอกชื่อภาษาไทย').max(100),
    lastNameTh: z.string().min(1, 'กรุณากรอกนามสกุลภาษาไทย').max(100),
    firstNameEn: z.string().min(1, 'กรุณากรอกชื่อภาษาอังกฤษ').max(100),
    lastNameEn: z.string().min(1, 'กรุณากรอกนามสกุลภาษาอังกฤษ').max(100),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
    birthDate: z.string().date('วันเดือนปีเกิดไม่ถูกต้อง'),
    educationLevel: z.enum(['secondary', 'high_school', 'bachelor', 'master', 'doctorate']),
    institutionNameTh: z.string().min(1, 'กรุณากรอกสถาบันศึกษา (TH)').max(255),
    institutionNameEn: z.string().min(1, 'กรุณากรอกสถาบันศึกษา (EN)').max(255),
    homeProvince: z.string().min(1, 'กรุณากรอกภูมิลำเนา (จังหวัด)').max(100),
    acceptedConsentDocIds: z.array(z.number().int().positive()).max(20).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export const registerVerifySchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    code: z.string().trim().regex(/^\d{6}$/, 'รหัสยืนยันต้องเป็นตัวเลข 6 หลัก'),
});

export const registerResendSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
});
