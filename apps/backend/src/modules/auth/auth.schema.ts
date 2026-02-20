import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    userName: z.string().min(2, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษร').max(50),
});

export const loginSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});
